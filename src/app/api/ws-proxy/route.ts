import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const upgrade = request.headers.get('upgrade');
  
  if (upgrade !== 'websocket') {
    return new NextResponse('Expected websocket', { status: 400 });
  }

  try {
    // AWS 백엔드로 WebSocket 연결
    const backendUrl = process.env.BACKEND_WS_URL || 'wss://bidflow.cloud/ws';
    
    // WebSocket 프록시 로직
    // Note: Vercel의 Edge Runtime에서는 WebSocket 프록시가 제한적입니다.
    // 대안으로 Next.js의 WebSocket 프록시 미들웨어를 사용해야 합니다.
    
    return new NextResponse('WebSocket proxy not supported in Edge Runtime', { 
      status: 501 
    });
  } catch (error) {
    console.error('WebSocket proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 