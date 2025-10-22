import { NextRequest } from 'next/server';

/**
 * POST /api/query
 * Proxy to x402 gateway - forwards requests and payment headers from client
 * Payment is handled by user's wallet on the client-side via x402-fetch
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

    // Get the x402 gateway URL from environment variable
    const gatewayUrl = 
      process.env.NEXT_PUBLIC_X402_GATEWAY_URL || 
      'https://x402.bedev.hubble-rpc.xyz/lego/api/v1/query';

    // Get X-PAYMENT header from client request (if present)
    const xPaymentHeader = request.headers.get('x-payment') || request.headers.get('X-Payment');
    
    console.log('\n' + '='.repeat(80));
    console.log('🚀 API Route: Proxying request to x402 gateway');
    console.log('='.repeat(80));
    console.log('📤 Gateway URL:', gatewayUrl);
    console.log('💳 Has Payment Header:', !!xPaymentHeader);

    // Prepare headers for gateway request
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Forward X-PAYMENT header from client if present
    if (xPaymentHeader) {
      headers['X-PAYMENT'] = xPaymentHeader;
      console.log('🔐 Forwarding payment header from client');
    }

    // Forward request to x402 gateway
    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question: message
      }),
    });

    console.log('📥 Gateway response status:', response.status);

    // Handle 402 Payment Required - return to client for payment
    if (response.status === 402) {
      const data = await response.json();
      console.log('💳 Payment required - returning 402 to client');
      
      return Response.json(data, { 
        status: 402,
        headers: {
          'Content-Type': 'application/json',
        }
      });
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
    
    // Get X-Payment-Response header from gateway
    const xPaymentResponseHeader = response.headers.get('x-payment-response') || 
                                    response.headers.get('X-Payment-Response');
    
    // Prepare response headers
    const responseHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Forward X-Payment-Response header to client if present
    if (xPaymentResponseHeader) {
      responseHeaders['X-Payment-Response'] = xPaymentResponseHeader;
      console.log('✅ Forwarding payment response header to client');
    }
    
    console.log('='.repeat(80) + '\n');
    
    // Return data in the expected format
    return Response.json(
      {
        success: true,
        sqlQuery: data?.sql_used ?? null,
        dbResults: Array.isArray(data?.data) ? data.data : [],
        raw: data,
      },
      { headers: responseHeaders }
    );

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
