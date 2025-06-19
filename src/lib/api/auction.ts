import { getApiBaseUrl } from '../config';

const API_BASE_URL = getApiBaseUrl();

export const getAuctionDetail = async (auctionId: string) => {
  const res = await fetch(`${API_BASE_URL}/auctions/${auctionId}`);
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
