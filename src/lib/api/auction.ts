import { getApiBaseUrl } from '../config';

const API_BASE_URL = getApiBaseUrl();

export const getAllAuctions = async (categoryId?: number) => {
  const url = categoryId 
    ? `${API_BASE_URL}/auctions?categoryId=${categoryId}`
    : `${API_BASE_URL}/auctions`;
  
  const res = await fetch(url, {
    credentials: 'include',
  });
  return res.json();
};

export const getAuctionDetail = async (auctionId: string) => {
  const res = await fetch(`${API_BASE_URL}/auctions/${auctionId}`, {
    credentials: 'include',
  });
  return res.json();
};

// 입찰 페이지 전용 상세 정보 조회 (최고 입찰자 정보 포함)
export const getAuctionBidDetail = async (auctionId: string) => {
  const res = await fetch(`${API_BASE_URL}/auctions/${auctionId}/bid-detail`, {
    credentials: 'include',
  });
  return res.json();
};

// 사용자별 입찰 내역 조회
export const getUserBidHistory = async (userUUID: string) => {
  const res = await fetch(`${API_BASE_URL}/auctions/${userUUID}/bids`, {
    credentials: 'include',
  });
  return res.json();
};

// 입찰은 WebSocket을 통해 처리됩니다 (/app/auction/bid)
// HTTP API로는 입찰 처리가 불가능합니다.
// export const postBid = async (auctionId: string, bidRequest: any) => {
//   const res = await fetch(`${API_BASE_URL}/auctions/${auctionId}/bids`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(bidRequest),
//   });
//   return res.json();
// };
