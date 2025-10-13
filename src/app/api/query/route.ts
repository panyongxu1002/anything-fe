import { NextRequest } from 'next/server';
import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * POST /api/query
 * Handles x402 payment flow on the server-side (secure)
 * All payment logic and private key handling happens here
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Parse question from body
    const message = typeof body?.question === 'string'
      ? body.question
      : typeof body?.message === 'string'
        ? body.message
        : '';

    if (!message.trim()) {
      return Response.json(
        { success: false, error: 'Invalid question parameter' },
        { status: 400 },
      );
    }

    const source = typeof body?.source === 'string' ? body.source : 'file';
    const thresholdInput = body?.threshold;
    const threshold = typeof thresholdInput === 'number'
      ? thresholdInput
      : typeof thresholdInput === 'string' && !Number.isNaN(Number.parseFloat(thresholdInput))
        ? Number.parseFloat(thresholdInput)
        : 0.7;

    // Get the x402 gateway URL from environment variable
    const gatewayUrl = 
      process.env.NEXT_PUBLIC_X402_GATEWAY_URL || 
      'https://x402.bedev.hubble-rpc.xyz/lego/api/v1/query';

    // Get private key from server-side environment variable (secure)
    const privateKey = process.env.CLIENT_PRIVATE_KEY;
    
    if (!privateKey) {
      console.error('❌ CLIENT_PRIVATE_KEY not configured');
      return Response.json(
        { success: false, error: 'Payment account not configured on server' },
        { status: 500 }
      );
    }

    console.log('\n' + '='.repeat(80));
    console.log('🚀 API Route: Processing query with x402 payment');
    console.log('='.repeat(80));

    // Create account from private key (server-side only)
    let account;
    try {
      account = privateKeyToAccount(privateKey as `0x${string}`);
      console.log('✅ Created payment account:', account.address);
    } catch (err) {
      console.error('❌ Failed to create account:', err);
      return Response.json(
        { success: false, error: 'Failed to initialize payment account' },
        { status: 500 }
      );
    }

    // Wrap fetch with x402 payment handling
    const fetchWithPayment = wrapFetchWithPayment(fetch, account);
    console.log('✅ Created x402-fetch wrapper');

    console.log('📤 Sending request to gateway:', gatewayUrl);

    // Make request with automatic payment handling
    const response = await fetchWithPayment(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: message,
        source,
        threshold,
      }),
    });

    console.log('📥 Gateway response status:', response.status);

    // x402-fetch already handled 402, so we should not receive it here
    // If we do, something went wrong
    if (response.status === 402) {
      console.error('❌ Unexpected 402 - x402-fetch should have handled this');
      return Response.json(
        { success: false, error: 'Payment flow failed' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gateway error:', response.status, errorText);
      return Response.json(
        { 
          success: false, 
          error: `Gateway request failed (${response.status})`,
          details: errorText 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Query successful, data received');
    
    // Get X-Payment-Response header from gateway response
    const xPaymentResponseHeader = response.headers.get('x-payment-response') || 
                                    response.headers.get('X-Payment-Response');
    
    let paymentInfo = null;
    if (xPaymentResponseHeader) {
      try {
        paymentInfo = decodeXPaymentResponse(xPaymentResponseHeader);
        console.log('💳 Payment successful:', paymentInfo);
      } catch (e) {
        console.warn('⚠️  Failed to decode payment response:', e);
      }
    }
    
    console.log('='.repeat(80) + '\n');
    
    // Return data in the expected format
    return Response.json({
      success: true,
      sqlQuery: data?.sql_used ?? null,
      dbResults: Array.isArray(data?.data) ? data.data : [],
      raw: data,
      paymentInfo, // Include payment info if available
    });

  } catch (error) {
    console.error('❌ Query API error:', error);
    console.error('❌ Error details:', error instanceof Error ? error.stack : error);
    return Response.json(
      { 
        success: false, 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
