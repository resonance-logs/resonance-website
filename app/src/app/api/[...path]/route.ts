import { NextRequest, NextResponse } from 'next/server';

const SERVER_INTERNAL_URL = process.env.SERVER_INTERNAL_URL || 'http://localhost:8080';

async function handleRequest(request: NextRequest) {
  try {
    // Extract the path after /api/
    const pathname = request.nextUrl.pathname;
    const apiPath = pathname.replace(/^\/api/, '');

    // Build the target URL
    const targetUrl = `${SERVER_INTERNAL_URL}${apiPath}${request.nextUrl.search}`;

    // Forward headers (excluding host and connection-related headers)
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      // Skip headers that shouldn't be forwarded
      if (!['host', 'connection', 'keep-alive', 'transfer-encoding'].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    // Prepare the request options
    const requestOptions: RequestInit = {
      method: request.method,
      headers,
      // Only include body for methods that support it
      ...(request.method !== 'GET' && request.method !== 'HEAD' && {
        body: await request.arrayBuffer(),
      }),
    };

    // Make the request to the backend
    const response = await fetch(targetUrl, requestOptions);

    // Get response body
    const responseBody = await response.arrayBuffer();

    // Forward response headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Skip headers that shouldn't be forwarded
      if (!['connection', 'keep-alive', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // Return the proxied response
    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 502 }
    );
  }
}

// Export handlers for all HTTP methods
export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

export async function PUT(request: NextRequest) {
  return handleRequest(request);
}

export async function PATCH(request: NextRequest) {
  return handleRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request);
}

export async function HEAD(request: NextRequest) {
  return handleRequest(request);
}

export async function OPTIONS(request: NextRequest) {
  return handleRequest(request);
}
