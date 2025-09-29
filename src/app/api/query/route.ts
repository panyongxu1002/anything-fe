import { NextRequest } from 'next/server';

const DEFAULT_QUERY_URL = 'https://api.dev.hubble-rpc.xyz/lego/api/v1/query';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    const queryUrl = process.env.HUBBLE_QUERY_URL || DEFAULT_QUERY_URL;
    const apiKey = process.env.HUBBLE_API_KEY;

    if (!apiKey) {
      console.error('Missing HUBBLE_API_KEY environment variable');
      return Response.json(
        { success: false, error: 'Server configuration error: missing HUBBLE_API_KEY' },
        { status: 500 },
      );
    }

    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'HUBBLE-API-KEY': apiKey,
      },
      body: JSON.stringify({
        question: message,
        source,
        threshold,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Query service error:', response.status, errorText);
      return Response.json(
        {
          success: false,
          error: `Query service error (${response.status})`,
          details: errorText,
        },
        { status: response.status },
      );
    }

    const data = await response.json();

    return Response.json(
      {
        success: true,
        sqlQuery: data?.sql_used ?? null,
        dbResults: Array.isArray(data?.data) ? data.data : [],
        raw: data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Query API error:', error);
    return Response.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
