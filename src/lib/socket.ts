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
 * 소켓 연결 함수 (쿠키 기반 인증)
 * @returns STOMP Client
 */
export const connectStomp = (): Client => {
  stompClient = new Client({
    webSocketFactory: () => {
      // SockJS 연결, 쿠키를 자동으로 전송
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
      
      console.log(`[socket.ts] Creating SockJS connection to: ${wsUrl}`);
      
      // SockJS transport 옵션 설정 (쿠키 전송 활성화)
      return new SockJS(wsUrl, null, {
        transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
        debug: false, // 디버그 로그 감소
        devel: false,
        // 연결 유지 설정 강화
        timeout: 15000,
        protocols_whitelist: ['websocket', 'xhr-streaming', 'xhr-polling'],
        info: {
          websocket: true,
          origins: ['*:*'],
          cookie_needed: true, // 쿠키 사용 활성화
          entropy: Math.random()
        }
      });
    },
    connectHeaders: {
      // 쿠키 기반 인증이므로 Authorization 헤더 제거
    },
    debug: (str) => console.log("[STOMP DEBUG]", str),
    reconnectDelay: 3000, // 재연결 주기를 3초로 단축
    heartbeatIncoming: 4000, // 서버로부터 heartbeat 수신 간격
    heartbeatOutgoing: 4000, // 서버로 heartbeat 전송 간격
    onConnect: (frame) => {
      console.log("[socket.ts] STOMP 연결 성공:", frame);
    },
    onStompError: (frame) => {
      console.error("[socket.ts] STOMP 에러:", frame.headers['message']);
      console.error("[socket.ts] STOMP 에러 세부사항:", frame.body);
    },
    onWebSocketClose: (event) => {
      // WebSocket 종료 코드에 따라 로그 레벨 구분
      if (event.code === 1000 || event.code === 0) {
        // 정상적인 연결 종료 (1000: Normal Closure, 0: 정상 종료)
        console.log("[socket.ts] WebSocket 정상 연결 종료:", event.code);
        console.log("[socket.ts] 연결 종료 상세:", {
          code: event.code,
          reason: event.reason || "정상 종료",
          wasClean: event.wasClean,
          timestamp: new Date().toISOString()
        });
      } else {
        // 비정상적인 연결 종료: 개발 환경에서만 에러 로그 출력
        if (process.env.NODE_ENV !== 'production') {
          console.error("[socket.ts] WebSocket 비정상 연결 종료:", event.code);
          console.error("[socket.ts] 연결 종료 상세:", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            timestamp: new Date().toISOString()
          });
        }
        // 운영 환경에서는 조용히 무시 또는 사용자 친화적 처리(필요시)
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
