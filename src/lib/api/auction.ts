// 프로덕션 환경에서는 HTTPS를 사용하고, 개발 환경에서는 HTTP localhost를 사용
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // 클라이언트 사이드에서 실행
    if (window.location.protocol === 'https:') {
      // 프로덕션 환경 (HTTPS)
      return process.env.NEXT_PUBLIC_API_URL || 'https://auction-service-fe.vercel.app:8080/api';
    }
  }
  // 개발 환경 또는 서버 사이드
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
};

const API_BASE_URL = getApiBaseUrl();

export const getAuctionDetail = async (auctionId: string) => {
  const res = await fetch(`${API_BASE_URL}/auctions/${auctionId}`);
  return res.json();
};

export const postBid = async (auctionId: string, bidRequest: any) => {
  const res = await fetch(`${API_BASE_URL}/auctions/${auctionId}/bids`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bidRequest),
  });
  return res.json();
};
