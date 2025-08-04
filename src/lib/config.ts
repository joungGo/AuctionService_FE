/**
 * API 설정을 중앙 집중화하는 파일
 * 환경에 따라 적절한 URL을 반환합니다.
 */

/**
 * 현재 환경에 맞는 API Base URL을 반환합니다.
 * 프로덕션 환경에서는 EC2 IP를 직접 사용합니다.
 */
export const getApiBaseUrl = (): string => {
  // 환경변수가 설정되어 있으면 우선 사용
  if (process.env.NEXT_PUBLIC_API_URL) {
    console.log('[config.ts] Using environment variable API URL:', process.env.NEXT_PUBLIC_API_URL);
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 클라이언트 사이드에서 실행 중인 경우
  if (typeof window !== 'undefined') {
    console.log('[config.ts] Running on client side, protocol:', window.location.protocol, 'hostname:', window.location.hostname);
    
    // 프로덕션 환경에서는 EC2 IP 직접 사용
    if (window.location.protocol === 'https:') {
      console.log('[config.ts] Production environment detected, using EC2 IP: http://13.125.44.217:8080/api');
      return 'http://13.125.44.217:8080/api';
    }
  }

  // 개발 환경 또는 서버 사이드 (기본값)
  console.log('[config.ts] Using development URL: http://localhost:8080/api');
  return 'http://localhost:8080/api';
};

/**
 * 현재 환경에 맞는 WebSocket URL을 반환합니다.
 * 프로덕션 환경에서는 EC2 IP를 직접 사용합니다.
 */
export const getWsUrl = (): string => {
  // 환경변수가 설정되어 있으면 우선 사용
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  // 클라이언트 사이드에서 실행 중인 경우
  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'https:') {
      // 프로덕션 환경 - EC2 IP 직접 사용
      return 'ws://13.125.44.217:8080/ws';
    }
  }

  // 개발 환경 또는 서버 사이드 (기본값)
  return 'ws://localhost:8080/ws';
};

/**
 * API 엔드포인트들
 */
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  LOGOUT: '/auth/logout',
  SEND_CODE: '/auth/send-code',
  VERIFY: '/auth/vertify',
  USERS: (userUUID: string) => `/auth/users/${userUUID}`,

  // Auctions
  AUCTIONS: '/auctions',
  AUCTION_DETAIL: (auctionId: string) => `/auctions/${auctionId}`,
  AUCTION_CLOSE: (auctionId: string) => `/auctions/${auctionId}/close`,
  AUCTION_WINNER: (userUUID: string) => `/auctions/${userUUID}/winner`,

  // Admin
  ADMIN_AUCTIONS: '/admin/auctions',
} as const; 