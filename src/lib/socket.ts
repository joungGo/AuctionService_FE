import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

let stompClient: Client | null = null;

// 프로덕션 환경에서는 HTTPS(WSS)를 사용하고, 개발 환경에서는 HTTP localhost를 사용
const getWsUrl = () => {
  console.log('[socket.ts] Environment check:', {
    isClient: typeof window !== 'undefined',
    protocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
    envVar: process.env.NEXT_PUBLIC_WS_URL
  });

  if (typeof window !== 'undefined') {
    // 클라이언트 사이드에서 실행
    if (window.location.protocol === 'https:') {
      // 프로덕션 환경 (HTTPS/WSS) - ALB를 통한 표준 포트 사용
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://auctionservice.site/ws';
      console.log('[socket.ts] Production WSS URL:', wsUrl);
      return wsUrl;
    }
  }
  // 개발 환경 또는 서버 사이드
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080/ws";
  console.log('[socket.ts] Development WS URL:', wsUrl);
  return wsUrl;
};

/**
 * 소켓 연결 함수 (토큰 포함)
 * @param token JWT 토큰
 * @returns STOMP Client
 */
export const connectStomp = (token: string): Client => {
  stompClient = new Client({
    webSocketFactory: () => {
      // SockJS 연결, 쿼리 파라미터로 토큰 전달 (핸드쉐이크)
      let wsUrl = getWsUrl();
      console.log(`[socket.ts] Original WebSocket URL: ${wsUrl}`);
      
      // SockJS를 위해 WSS -> HTTPS, WS -> HTTP 변환
      if (wsUrl.startsWith('wss://')) {
        wsUrl = wsUrl.replace('wss://', 'https://');
        console.log(`[socket.ts] Converted WSS to HTTPS: ${wsUrl}`);
      } else if (wsUrl.startsWith('ws://')) {
        wsUrl = wsUrl.replace('ws://', 'http://');
        console.log(`[socket.ts] Converted WS to HTTP: ${wsUrl}`);
      }
      
      console.log(`[socket.ts] Creating SockJS connection to: ${wsUrl}?token=${token.substring(0, 20)}...`);
      
      // SockJS transport 옵션 명시적 설정
      return new SockJS(`${wsUrl}?token=${token}`, null, {
        transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
        debug: true,
        devel: false
      });
    },
    connectHeaders: {
      Authorization: `Bearer ${token}`, // STOMP 연결 시 헤더에 토큰 추가
    },
    debug: (str) => console.log("[STOMP DEBUG]", str),
    reconnectDelay: 5000, // 재연결 주기 (5초)
    onConnect: (frame) => {
      console.log("[socket.ts] STOMP 연결 성공:", frame);
    },
    onStompError: (frame) => {
      console.error("[socket.ts] STOMP 에러:", frame.headers['message']);
      console.error("[socket.ts] STOMP 에러 세부사항:", frame.body);
    },
    onWebSocketClose: (event) => {
      console.error("[socket.ts] WebSocket 연결 종료:", event);
    },
    onWebSocketError: (event) => {
      console.error("[socket.ts] WebSocket 에러:", event);
    },
  });

  console.log("[socket.ts] STOMP 클라이언트 연결 시도");
  stompClient.activate(); // 연결 시작
  return stompClient;
};

/**
 * 경매 소켓 구독 함수
 * @param client STOMP Client
 * @param auctionId 경매 ID
 * @param onMessage 메시지 수신 시 콜백
 */
export const subscribeToAuction = (
  client: Client,
  auctionId: string,
  onMessage: (message: any) => void
) => {
  console.log("[socket.ts] 경매 구독 시작. 경매 ID:", auctionId);

  client.onConnect = () => {
    console.log("[socket.ts] STOMP 연결 성공. 구독 진행");
    client.subscribe(`/sub/auction/${auctionId}`, (msg) => {
      console.log("[socket.ts] STOMP 메시지 수신:", msg.body);
      onMessage(JSON.parse(msg.body));
    });
  };
};

/**
 * 경매 입찰, 채팅 등 메시지 전송 함수 (Body에 토큰 포함)
 * @param destination 서버로 보낼 목적지 (ex: "/app/auction/bid")
 * @param message 보낼 메시지 (객체)
 * @param token JWT 토큰 (Body로 포함)
 */
export const sendAuctionMessage = (
  destination: string,
  message: any,
  token: string
) => {
  if (!stompClient || !stompClient.connected) {
    console.error("[socket.ts] STOMP 연결 안 됨. 메시지 전송 실패.");
    return;
  }

  console.log(`[socket.ts] 메시지 전송: ${destination}`, message);

  // 토큰을 body에 포함
  const messageWithToken = {
    ...message,
    token: token, // body 안에 token 필드로 포함
  };

  stompClient.publish({
    destination: destination, // 예: "/app/auction/bid"
    body: JSON.stringify(messageWithToken), // JSON 문자열로 변환
    headers: {}, // 헤더 비워둠 (SockJS는 헤더 깨질 수 있음)
  });
};

/**
 * 소켓 연결 해제 함수
 */
export const disconnectStomp = () => {
  if (stompClient) {
    stompClient.deactivate(); // 연결 해제
    console.log("[socket.ts] STOMP 클라이언트 연결 해제");
  }
};
