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
      // 프로덕션 환경 (HTTPS/WSS) - 네이티브 WebSocket 사용
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://bidflow.cloud/ws';
      console.log('[socket.ts] Production WSS URL:', wsUrl);
      return wsUrl;
    }
  }
  // 개발 환경 또는 서버 사이드
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";
  console.log('[socket.ts] Development WS URL:', wsUrl);
  return wsUrl;
};

/**
 * 소켓 연결 함수 (쿠키 기반 인증)
 * @returns STOMP Client
 */
export const connectStomp = (userUUID?: string, auctionId?: string): Client => {
  // 쿠키 확인 로깅
  if (typeof window !== 'undefined') {
    console.log('[socket.ts] 현재 쿠키 확인:', document.cookie);
    console.log('[socket.ts] 쿠키 상세 정보:', {
      domain: document.domain,
      pathname: window.location.pathname,
      protocol: window.location.protocol,
      hostname: window.location.hostname
    });
  }

  stompClient = new Client({
    webSocketFactory: () => {
      let wsUrl = getWsUrl();
      
      // wsUrl이 ws:// 또는 wss://로 시작하는지 확인
      if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
        // http/https를 ws/wss로 변환
        if (wsUrl.startsWith('https://')) wsUrl = wsUrl.replace('https://', 'wss://');
        else if (wsUrl.startsWith('http://')) wsUrl = wsUrl.replace('http://', 'ws://');
      }
      console.log(`[socket.ts] Creating native WebSocket connection to: ${wsUrl}`);
      console.log(`[socket.ts] WebSocket 연결 시 쿠키 전송 확인:`, document.cookie);
      
      // WebSocket 생성 시 쿠키 전송 확인
      const ws = new WebSocket(wsUrl);
      console.log(`[socket.ts] WebSocket 객체 생성 완료, 쿠키 전송 상태:`, {
        url: wsUrl,
        cookies: document.cookie,
        readyState: ws.readyState
      });
      
      return ws;
    },
    connectHeaders: {
      ...(userUUID && { userUUID }),
      ...(auctionId && { auctionId }),
    },
    debug: (str) => console.log("[STOMP DEBUG]", str),
    reconnectDelay: 3000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    onConnect: (frame) => {
      console.log("[socket.ts] STOMP 연결 성공:", frame);
    },
    onStompError: (frame) => {
      console.error("[socket.ts] STOMP 에러:", frame.headers['message']);
      console.error("[socket.ts] STOMP 에러 세부사항:", frame.body);
    },
    onWebSocketClose: (event) => {
      if (event.code === 1000 || event.code === 0) {
        console.log("[socket.ts] WebSocket 정상 연결 종료:", event.code);
        console.log("[socket.ts] 연결 종료 상세:", {
          code: event.code,
          reason: event.reason || "정상 종료",
          wasClean: event.wasClean,
          timestamp: new Date().toISOString()
        });
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.error("[socket.ts] WebSocket 비정상 연결 종료:", event.code);
          console.error("[socket.ts] 연결 종료 상세:", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            timestamp: new Date().toISOString()
          });
        }
      }
    },
    onWebSocketError: (event) => {
      console.error("[socket.ts] WebSocket 에러:", event);
    },
    onDisconnect: (frame) => {
      console.log("[socket.ts] STOMP 연결 해제:", frame);
    }
  });
  console.log("[socket.ts] STOMP 클라이언트 연결 시도");
  stompClient.activate();
  return stompClient;
};

/**
 * 경매 소켓 구독 함수
 * @param client STOMP Client
 * @param auctionId 경매 ID
 * @param userUUID 사용자 UUID
 * @param callback 메시지 수신 시 콜백
 * @returns 구독 ID
 */
export const subscribeToAuction = (
  client: Client,
  auctionId: string,
  userUUID: string,
  callback: (msg: any) => void
) => {
  const id = `auction-${auctionId}-${userUUID}`;
  const headers = { id, auctionId, userUUID };
  console.log("[socket.ts] STOMP 구독 헤더:", headers);
  if (!client.connected) {
    console.error("[socket.ts] STOMP 연결 안 됨. 구독 실패.");
    return null;
  }
  const subscription = client.subscribe(`/sub/auction/${auctionId}`, (msg) => {
    console.log("[socket.ts] STOMP 메시지 수신:", msg.body);
    callback(JSON.parse(msg.body));
  }, headers);
  return subscription; // Subscription 객체 전체 반환
};

/**
 * 경매 입찰, 채팅 등 메시지 전송 함수 (쿠키 기반 인증)
 * @param destination 서버로 보낼 목적지 (ex: "/app/auction/bid")
 * @param message 보낼 메시지 (객체)
 */
export const sendAuctionMessage = (
  destination: string,
  message: any
) => {
  if (!stompClient || !stompClient.connected) {
    console.error("[socket.ts] STOMP 연결 안 됨. 메시지 전송 실패.");
    return;
  }

  console.log(`[socket.ts] 메시지 전송: ${destination}`, message);

  // 쿠키 기반 인증이므로 토큰을 body에 포함하지 않음
  stompClient.publish({
    destination: destination, // 예: "/app/auction/bid"
    body: JSON.stringify(message), // JSON 문자열로 변환
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
