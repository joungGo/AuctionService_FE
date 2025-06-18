import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://43.201.193.75:8080';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'DELETE');
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const path = pathSegments.join('/');
    const url = `${BACKEND_URL}/api/${path}`;
    
    // 요청 헤더 복사 (Authorization 등)
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (!key.startsWith('host') && !key.startsWith('origin')) {
        headers[key] = value;
      }
    });

    // 요청 본문 복사 (POST, PUT의 경우)
    const body = ['GET', 'DELETE'].includes(method) 
      ? undefined 
      : await request.text();

    // 쿼리 파라미터 복사
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const finalUrl = queryString ? `${url}?${queryString}` : url;

    console.log(`[API Proxy] ${method} ${finalUrl}`);

    const response = await fetch(finalUrl, {
      method,
      headers,
      body,
    });

    const responseText = await response.text();
    
    // 응답 헤더 설정
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!key.startsWith('transfer-encoding') && !key.startsWith('content-encoding')) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('[API Proxy Error]:', error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 }
    );
  }
} 