// src/app/auctions/[auctionId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  connectStomp,
  subscribeToAuction,
  disconnectStomp,
} from "@/lib/socket";
import { getAuctionDetail } from "@/lib/api/auction";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";

interface AuctionEndMessage { 
  auctionId: number; 
  winnerNickname: string; 
  winningBid: number; 
}

// 실제 API 응답 구조에 맞게 수정
interface Auction { 
  auctionId: number;
  productName: string; 
  imageUrl: string; 
  description: string; 
  startPrice: number; 
  currentBid: number; 
  minBid: number; 
  endTime: string;
  startTime: string;
}

export default function AuctionPage() {
  const { auctionId } = useParams() as { auctionId: string };
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [bidCount, setBidCount] = useState<number>(0);
  const [auctionEndData, setAuctionEndData] = useState<AuctionEndMessage | null>(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Toast 표시 함수
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setToastMessage(null);
    }, 4000);
  };

  // 로그인 체크
  useEffect(() => {
    if (!isLoading && !user) {
      alert("로그인이 필요합니다.");
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  // 웹소켓 연결 및 메시지 수신
  useEffect(() => {
    if (!user || !auctionId) return;

    const stompClient = connectStomp();

    subscribeToAuction(stompClient, auctionId, (msg) => {
      console.log("[AuctionPage] 웹소켓 메시지 수신:", msg);

      // 경매 종료 메시지 처리
      if (msg.winnerNickname && msg.winningBid !== undefined) {
        setAuctionEndData(msg);
        setShowEndDialog(true);
        return;
      }

      // 입찰 관련 메시지 처리 (실시간 업데이트만)
      if (msg.nickname && msg.nickname !== "System" && msg.currentBid && msg.currentBid > 0) {
        // 현재 입찰가 업데이트
        setAuction((prev: Auction | null) => 
          prev ? { ...prev, currentBid: msg.currentBid } : prev
        );
        // 입찰 수 증가
        setBidCount(prev => prev + 1);
      }
    });

    return () => disconnectStomp();
  }, [user, auctionId]);

  // 경매 상세 조회
  useEffect(() => {
    (async () => {
      const data = await getAuctionDetail(auctionId);
      console.log("[AuctionPage] API 응답:", data);
      if (data?.data) {
        console.log("[AuctionPage] 경매 데이터:", data.data);
        setAuction(data.data);
        calculateTimeLeft(data.data.endTime);
      }
    })();
  }, [auctionId]);

  // 남은 시간 계산
  useEffect(() => {
    if (!auction?.endTime) return;
    const interval = setInterval(() => calculateTimeLeft(auction.endTime), 1000);
    return () => clearInterval(interval);
  }, [auction?.endTime]);

  const calculateTimeLeft = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = new Date().getTime();
    const diff = end - now;

    if (diff <= 0) return setTimeLeft("경매 종료");

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    // 항상 초까지 표시하되, 0인 값들은 생략
    let timeStr = "";
    if (days > 0) timeStr += `${days}일 `;
    if (hours > 0) timeStr += `${hours}시간 `;
    if (minutes > 0) timeStr += `${minutes}분 `;
    timeStr += `${seconds}초`;
    
    setTimeLeft(timeStr.trim());
  };

  // 입찰 페이지로 이동
  const handleBidClick = () => {
    if (timeLeft === "경매 종료") {
      showToastMessage("이미 종료된 경매입니다.");
      return;
    }
    router.push(`/auctions/${auctionId}/bid`);
  };

  if (isLoading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  if (!user) return <div className="flex justify-center items-center min-h-screen">로그인이 필요합니다.</div>;
  if (!auction) return <div className="flex justify-center items-center min-h-screen">경매 정보를 불러오는 중...</div>;

  return (
    <>
      {/* Toast 알림 */}
      {showToast && toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* 경매 종료 다이얼로그 */}
      {auctionEndData && (
        <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>🏆 경매 종료 🏆</DialogTitle>
            </DialogHeader>
            <p>낙찰자: {auctionEndData.winnerNickname}</p>
            <p>낙찰 금액: {(auctionEndData.winningBid || 0).toLocaleString()}원</p>
            <DialogFooter>
              <Button onClick={() => router.push("/")}>메인으로 이동</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Figma 디자인 100% 반영 */}
      <div className="bg-[#ffffff] box-border content-stretch flex flex-col items-start justify-start p-0 relative size-full">
        <div className="bg-neutral-50 min-h-[800px] relative shrink-0 w-full">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start min-h-inherit overflow-clip p-0 relative w-full">
            
            {/* 메인 컨텐츠 */}
            <div className="relative shrink-0 w-full">
              <div className="flex flex-row justify-center relative size-full">
                <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-row items-start justify-center px-40 py-5 relative w-full">
                  <div className="basis-0 grow max-w-[960px] min-h-px min-w-px relative shrink-0">
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start max-w-inherit overflow-clip p-0 relative w-full">
                      
                      {/* 브레드크럼 네비게이션 */}
                      <div className="relative shrink-0 w-full">
                        <div className="[flex-flow:wrap] bg-clip-padding border-0 border-[transparent] border-solid box-border content-start flex gap-2 items-start justify-start p-[16px] relative w-full">
                          <div className="relative shrink-0">
                            <div className="css-ay0434 font-['Work_Sans:Medium',_'Noto_Sans_KR:Regular',_sans-serif] font-medium leading-[0] relative shrink-0 text-[#5c738a] text-[16px] text-left text-nowrap w-full">
                              <p className="block leading-[24px] whitespace-pre cursor-pointer hover:text-[#0f1417]" onClick={() => router.push("/")}>홈</p>
                            </div>
                          </div>
                          <div className="relative shrink-0">
                            <div className="css-ay0434 font-['Work_Sans:Medium',_sans-serif] font-medium leading-[0] relative shrink-0 text-[#5c738a] text-[16px] text-left text-nowrap w-full">
                              <p className="block leading-[24px] whitespace-pre">/</p>
                            </div>
                          </div>
                          <div className="relative shrink-0">
                            <div className="css-ay0434 font-['Work_Sans:Medium',_'Noto_Sans_KR:Regular',_sans-serif] font-medium leading-[0] relative shrink-0 text-[#5c738a] text-[16px] text-left text-nowrap w-full">
                              <p className="block leading-[24px] whitespace-pre">수집품</p>
                            </div>
                          </div>
                          <div className="relative shrink-0">
                            <div className="css-ay0434 font-['Work_Sans:Medium',_sans-serif] font-medium leading-[0] relative shrink-0 text-[#5c738a] text-[16px] text-left text-nowrap w-full">
                              <p className="block leading-[24px] whitespace-pre">/</p>
                            </div>
                          </div>
                          <div className="relative shrink-0">
                            <div className="css-1bkkkk font-['Work_Sans:Medium',_'Noto_Sans_KR:Regular',_sans-serif] font-medium leading-[0] relative shrink-0 text-[#0f1417] text-[16px] text-left text-nowrap w-full">
                              <p className="block leading-[24px] whitespace-pre">{auction.productName || auction.name || "경매 상품"}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 상품 제목 */}
                      <div className="relative shrink-0 w-full">
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start pb-3 pt-5 px-4 relative w-full">
                          <div className="css-1bkkkk font-['Work_Sans:Bold',_'Noto_Sans_KR:Bold',_sans-serif] font-bold leading-[0] relative shrink-0 text-[#0f1417] text-[28px] text-left w-full">
                            <p className="block leading-[35px]">{auction.productName || auction.name || "경매 상품"}</p>
                          </div>
                        </div>
                      </div>

                      {/* 상품 설명 */}
                      <div className="relative shrink-0 w-full">
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start pb-3 pt-1 px-4 relative w-full">
                          <div className="css-1bkkkk font-['Work_Sans:Regular',_'Noto_Sans_KR:Regular',_sans-serif] font-normal leading-[0] relative shrink-0 text-[#0f1417] text-[16px] text-left w-full">
                            <p className="block leading-[24px]">{auction.description || "상품 설명이 없습니다."}</p>
                          </div>
                        </div>
                      </div>

                      {/* 이미지 */}
                      <div className="bg-neutral-50 relative shrink-0 w-full">
                        <div className="p-4">
                          <div className="bg-neutral-50 rounded-xl overflow-hidden">
                            {auction.imageUrl && auction.imageUrl.trim() ? (
                              <img
                                src={auction.imageUrl.startsWith('http') ? auction.imageUrl.trim() : `https://${auction.imageUrl.trim()}`}
                                alt={auction.productName || auction.name || "경매 상품"}
                                className="w-full h-[400px] object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-full h-[400px] bg-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400">
                                <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                                </svg>
                                <span className="text-lg">이미지 없음</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 경매 상세 정보 제목 */}
                      <div className="relative shrink-0 w-full">
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start pb-2 pt-4 px-4 relative w-full">
                          <div className="css-1bkkkk font-['Work_Sans:Bold',_'Noto_Sans_KR:Bold',_sans-serif] font-bold leading-[0] relative shrink-0 text-[#0f1417] text-[18px] text-left w-full">
                            <p className="block leading-[23px]">경매 상세 정보</p>
                          </div>
                        </div>
                      </div>

                      {/* 경매 상세 정보 테이블 */}
                      <div className="relative shrink-0 w-full">
                        <div className="p-4 space-y-4">
                          {/* 첫 번째 행 - 시작 입찰가 / 현재 입찰가 */}
                          <div className="flex gap-6 border-t border-[#e5e8eb] pt-5 pb-5">
                            <div className="w-[186px]">
                              <div className="text-[#5c738a] text-[14px] mb-2">시작 입찰가</div>
                              <div className="text-[#0f1417] text-[14px]">{(auction.startPrice || 0).toLocaleString()}원</div>
                            </div>
                            <div className="flex-1">
                              <div className="text-[#5c738a] text-[14px] mb-2">현재 입찰가</div>
                              <div className="text-[#0f1417] text-[14px]">{(auction.currentBid || auction.startPrice || 0).toLocaleString()}원</div>
                            </div>
                          </div>
                          
                          {/* 두 번째 행 - 남은 시간 / 빈 공간 */}
                          <div className="flex gap-6 border-t border-[#e5e8eb] pt-5 pb-5">
                            <div className="w-[186px]">
                              <div className="text-[#5c738a] text-[14px] mb-2">남은 시간</div>
                              <div className="text-[#0f1417] text-[14px]">{timeLeft}</div>
                            </div>
                            <div className="flex-1">
                              <div className="text-[#5c738a] text-[14px] mb-2">&nbsp;</div>
                              <div className="text-[#0f1417] text-[14px]">-</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 입찰하기 버튼 */}
                      <div className="relative shrink-0 w-full">
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-row items-start justify-start px-4 py-3 relative w-full">
                          <div 
                            className="bg-[#dbe8f2] h-10 max-w-[480px] min-w-[84px] relative rounded-xl shrink-0 cursor-pointer hover:bg-[#c8ddf0] transition-colors"
                            onClick={handleBidClick}
                          >
                            <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-row h-10 items-center justify-center max-w-inherit min-w-inherit overflow-clip px-4 py-0 relative">
                              <div className="relative shrink-0">
                                <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-center justify-start overflow-clip p-0 relative">
                                  <div className="css-cn0mda font-['Work_Sans:Bold',_'Noto_Sans_KR:Bold',_sans-serif] font-bold leading-[0] overflow-ellipsis overflow-hidden relative shrink-0 text-[#0f1417] text-[14px] text-center text-nowrap w-full">
                                    <p className="block leading-[21px] overflow-inherit whitespace-pre">입찰하기</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 배송 및 반품 제목 */}
                      <div className="relative shrink-0 w-full">
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start pb-2 pt-4 px-4 relative w-full">
                          <div className="css-1bkkkk font-['Work_Sans:Bold',_'Noto_Sans_KR:Bold',_sans-serif] font-bold leading-[0] relative shrink-0 text-[#0f1417] text-[18px] text-left w-full">
                            <p className="block leading-[23px]">배송 및 반품</p>
                          </div>
                        </div>
                      </div>

                      {/* 배송 및 반품 내용 */}
                      <div className="relative shrink-0 w-full">
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start pb-3 pt-1 px-4 relative w-full">
                          <div className="css-1bkkkk font-['Work_Sans:Regular',_'Noto_Sans_KR:Regular',_sans-serif] font-normal leading-[0] relative shrink-0 text-[#0f1417] text-[16px] text-left w-full">
                            <p className="block leading-[24px]">배송 비용은 경매 종료 시 계산됩니다. 상품이 설명과 다를 경우 배송 후 14일 이내에 반품이 가능합니다.</p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}