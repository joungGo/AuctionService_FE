// src/app/auctions/[auctionId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuctionDetail } from "@/lib/api/auction";
import { getCategoryById, Category } from "@/lib/api/category";
import Breadcrumb from "@/components/auction/Breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { useWebSocket } from "@/app/context/WebSocketContext";
import { getMyFavorites, addFavorite, removeFavorite } from '@/lib/api/auction';
import { Tooltip } from '@/components/ui/tooltip';

// 관심목록(찜) 인터페이스
interface Favorite {
  favoriteId: number;
  auctionId: number;
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
  categoryId?: number;
  categoryName?: string;
}

export default function AuctionPage() {
  const { auctionId } = useParams() as { auctionId: string };
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { subscribe, unsubscribe, isConnected } = useWebSocket();
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  const [auction, setAuction] = useState<Auction | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [bidCount, setBidCount] = useState<number>(0);
  const [auctionEndData, setAuctionEndData] = useState<any | null>(null); // AuctionEndMessage 대신 any로 변경
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [isAuctionOngoing, setIsAuctionOngoing] = useState(false);
  const [isAuctionScheduled, setIsAuctionScheduled] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);

  // Toast 표시 함수
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setToastMessage(null);
    }, 4000);
  };

  // 경매 이름/설명/이미지 우선순위 추출 함수 (product 우선)
  const getAuctionName = (auction: any) =>
    auction.product?.productName || auction.productName || auction.name || auction.auctionName || "경매 상품";
  const getAuctionDescription = (auction: any) =>
    auction.product?.description || auction.description || auction.desc || auction.auctionDescription || "상품 설명이 없습니다.";
  const getAuctionImageUrl = (auction: any) =>
    auction.product?.imageUrl || auction.imageUrl || null;

  // 로그인 체크
  useEffect(() => {
    if (!isLoading && !user) {
      alert("로그인이 필요합니다.");
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  // 웹소켓 구독 관리
  useEffect(() => {
    if (!user || !auctionId || !isConnected) return;
    const subId = subscribe(`/sub/auction/${auctionId}`, (msg) => {
      console.log("[AuctionPage] 웹소켓 메시지 수신:", msg);
      // 실시간 참여자 수 메시지 처리
      if (typeof msg.participantCount === 'number') {
        setParticipantCount(msg.participantCount);
      }
      // 경매 종료 메시지 처리
      if (msg.winnerNickname && msg.winningBid !== undefined) {
        setAuctionEndData(msg);
        setShowEndDialog(true);
        return;
      }
      // 입찰 관련 메시지 처리
      if (msg.nickname && msg.nickname !== "System" && msg.currentBid && msg.currentBid > 0) {
        setAuction((prev: Auction | null) => 
          prev ? { ...prev, currentBid: msg.currentBid } : prev
        );
        setBidCount(prev => prev + 1);
      }
    }, user.userUUID);
    setSubscriptionId(subId);
    return () => {
      if (subId) unsubscribe(subId);
    };
  }, [user, auctionId, isConnected, subscribe, unsubscribe]);

  // 경매 상세 조회 및 카테고리 정보 조회
  useEffect(() => {
    (async () => {
      const data = await getAuctionDetail(auctionId);
      console.log("[AuctionPage] API 응답:", data);
      if (data?.data) {
        console.log("[AuctionPage] 경매 데이터:", data.data);
        setAuction(data.data);
        calculateTimeLeft(data.data.endTime);
        
        // 카테고리 정보 조회
        if (data.data.categoryId) {
          try {
            const categoryData = await getCategoryById(data.data.categoryId);
            setCategory(categoryData.data);
          } catch (err) {
            console.error("[AuctionPage] 카테고리 조회 실패:", err);
          }
        }
      }
    })();
  }, [auctionId]);

  // 남은 시간 계산
  useEffect(() => {
    if (!auction?.endTime) return;
    const interval = setInterval(() => calculateTimeLeft(auction.endTime), 1000);
    return () => clearInterval(interval);
  }, [auction?.endTime]);

  // 경매 상태 체크 (Status 기반)
  useEffect(() => {
    if (!auction) return;
    setIsAuctionOngoing(auction.status === 'ONGOING');
    setIsAuctionScheduled(auction.status === 'UPCOMING');
  }, [auction?.status]);

  // 경매 상세 진입 시 내 관심목록에 있는지 확인
  useEffect(() => {
    if (!user || !auctionId) return;
    getMyFavorites().then((data) => {
      if (data?.data && Array.isArray(data.data)) {
        const found = data.data.find((fav: Favorite) => fav.auctionId === Number(auctionId));
        setIsFavorite(!!found);
        setFavoriteId(found ? found.favoriteId : null);
      }
    });
  }, [user, auctionId]);

  // 찜 등록/해제 핸들러
  const handleToggleFavorite = async () => {
    if (!user || !auctionId) return;
    try {
      if (isFavorite) {
        await removeFavorite(Number(auctionId));
        setIsFavorite(false);
        setFavoriteId(null);
      } else {
        const res = await addFavorite(Number(auctionId));
        if (res?.data) {
          setIsFavorite(true);
          setFavoriteId(res.data.favoriteId);
        }
      }
    } catch (e) {
      alert('찜 처리에 실패했습니다.');
    }
  };

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
                      <Breadcrumb 
                        category={category}
                        productName={getAuctionName(auction)}
                      />

                      {/* 상품 제목 */}
                      <div className="relative shrink-0 w-full">
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start pb-3 pt-5 px-4 relative w-full">
                          <div className="flex items-center gap-3 css-1bkkkk font-['Work_Sans:Bold','Noto_Sans_KR:Bold',sans-serif] font-bold leading-[0] relative shrink-0 text-[#0f1417] text-[28px] text-left w-full">
                            <span className="block leading-[35px]">{getAuctionName(auction)}</span>
                            {/* ♥ 찜 버튼 */}
                            <Tooltip content={isFavorite ? '찜 해제' : '찜하기'}>
                              <button
                                className={`ml-2 text-2xl transition-all duration-200 transform hover:scale-125 ${isFavorite ? 'text-red-500' : 'text-gray-400'} hover:text-red-600`}
                                title={isFavorite ? '찜 해제' : '찜 등록'}
                                onClick={handleToggleFavorite}
                              >
                                {isFavorite ? '♥' : '♡'}
                              </button>
                            </Tooltip>
                            <span className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                              👥 {participantCount !== null ? `${participantCount}명` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 상품 설명 */}
                      <div className="relative shrink-0 w-full">
                        <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start pb-3 pt-1 px-4 relative w-full">
                          <div className="css-1bkkkk font-['Work_Sans:Regular',_'Noto_Sans_KR:Regular',_sans-serif] font-normal leading-[0] relative shrink-0 text-[#0f1417] text-[16px] text-left w-full">
                            <p className="block leading-[24px]">{getAuctionDescription(auction)}</p>
                          </div>
                        </div>
                      </div>

                      {/* 이미지 */}
                      <div className="bg-neutral-50 relative shrink-0 w-full">
                        <div className="p-4">
                          <div className="bg-neutral-50 rounded-xl overflow-hidden">
                            {getAuctionImageUrl(auction) && getAuctionImageUrl(auction).trim() ? (
                              <img
                                src={getAuctionImageUrl(auction).startsWith('http') ? getAuctionImageUrl(auction).trim() : `https://${getAuctionImageUrl(auction).trim()}`}
                                alt={getAuctionName(auction)}
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
                          <button
                            className={`bg-[#dbe8f2] h-10 max-w-[480px] min-w-[84px] relative rounded-xl shrink-0 transition-colors px-4 flex items-center justify-center font-bold text-[#0f1417] text-[14px] ${isAuctionOngoing ? 'cursor-pointer hover:bg-[#c8ddf0]' : 'cursor-not-allowed opacity-60'}`}
                            onClick={isAuctionOngoing ? handleBidClick : undefined}
                            disabled={!isAuctionOngoing}
                            title={isAuctionScheduled ? '경매 시작 전에는 입찰할 수 없습니다.' : (timeLeft === '경매 종료' ? '이미 종료된 경매입니다.' : '')}
                          >
                            <span className="block leading-[21px] overflow-inherit whitespace-pre">입찰하기</span>
                          </button>
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