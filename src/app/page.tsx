"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";
import dayjs from "dayjs";
import { getApiBaseUrl } from "@/lib/config";

// 히어로 섹션 배경 이미지만 유지 (UI 디자인 요소)
const imgHeroBackground = "http://localhost:3845/assets/c5a45c49b9693bc77cdfcadb467fef26dcfb67f1.png";

export default function AuctionPage() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState<{ [key: number]: string }>({});

  // ✅ 경매 데이터 불러오기 (초기 로딩용) - 기존 로직 그대로 유지
  const fetchAuctions = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError("");
    try {
      const apiBaseUrl = getApiBaseUrl();
      const fullUrl = `${apiBaseUrl}/auctions`;
      console.log('[page.tsx] Fetching auctions from:', fullUrl);
      
      const response = await fetch(fullUrl);
      console.log('[page.tsx] Response status:', response.status);
      
      if (!response.ok) throw new Error("경매 목록 조회 실패");
      const data = await response.json();
      console.log('[page.tsx] Response data:', data);
      setAuctions(data.data);
    } catch (err: any) {
      console.error('[page.tsx] Fetch error:', err);
      setError(err.message);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  // ✅ 최초 호출 및 주기적 갱신 - 기존 로직 그대로 유지
  useEffect(() => {
    fetchAuctions(true);
    const interval = setInterval(() => {
      console.log("🔄 메인 페이지 경매 목록 갱신 중...");
      fetchAuctions(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ✅ 남은 시간 계산 - 기존 로직 그대로 유지
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedTimes: { [key: number]: string } = {};
      const now = dayjs();

      auctions.forEach((auction) => {
        const start = dayjs(auction.startTime);
        const end = dayjs(auction.endTime);

        let targetTime;
        if (now.isBefore(start)) {
          targetTime = start;
        } else if (now.isBefore(end)) {
          targetTime = end;
        } else {
          return;
        }

        const diff = targetTime.diff(now);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (days > 0) {
          updatedTimes[auction.auctionId] = `${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
        } else {
          updatedTimes[auction.auctionId] = `${hours}시간 ${minutes}분 ${seconds}초`;
        }
      });

      setTimeLeft(updatedTimes);
    }, 1000);

    return () => clearInterval(interval);
  }, [auctions]);

  // 필터링 - 기존 로직 그대로 유지
  const now = dayjs();
  const ongoingAuctions = auctions.filter(
    (a) => now.isAfter(dayjs(a.startTime)) && now.isBefore(dayjs(a.endTime))
  );
  const upcomingAuctions = auctions.filter((a) => now.isBefore(dayjs(a.startTime)));

  // 인기 상품 로직 - 현재 입찰가 기준으로 정렬
  const popularAuctions = auctions
    .filter(auction => auction.currentBidAmount || auction.startingBid) // 입찰가가 있는 경매만
    .sort((a, b) => {
      // 현재 입찰가 기준 내림차순 정렬 (높은 가격순)
      const priceA = a.currentBidAmount || a.startingBid || 0;
      const priceB = b.currentBidAmount || b.startingBid || 0;
      return priceB - priceA;
    })
    .slice(0, 3); // 상위 3개 선택

  // 히어로 섹션 스크롤 함수
  const scrollToAuctions = () => {
    const element = document.getElementById('auctions-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-neutral-50 min-h-[800px] w-full">
      {/* 로딩 및 에러 상태 - 기존 로직 유지 */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">불러오는 중...</p>
        </div>
      )}
      {refreshing && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm z-50">
          🔄 갱신 중...
        </div>
      )}
      {error && (
        <div className="flex justify-center items-center h-64">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <div className="flex flex-row justify-center w-full">
        <div className="flex flex-col items-start justify-start w-full max-w-[960px] px-4 lg:px-40 py-5">
          
          {/* 히어로 섹션 */}
          <div className="w-full p-4">
            <div 
              className="h-[480px] w-full rounded-xl relative bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.4) 100%), url('${imgHeroBackground}')`,
              }}
            >
              <div className="absolute left-[216px] top-[369px] flex flex-col gap-2">
                <div className="w-[618px]">
                  <h1 className="font-black text-[48px] leading-[60px] text-white tracking-[-2px]">
                    특별한 상품을 만나보세요
                  </h1>
                </div>
                <div>
                  <p className="font-normal text-[16px] leading-[24px] text-white">
                    실시간 경매에서 희귀하고 특별한 상품에 입찰하세요. 오늘 당신의 보물을 찾아보세요.
                  </p>
                </div>
              </div>
              <button 
                onClick={scrollToAuctions}
                className="absolute left-[216px] top-[493px] bg-[#dbe8f2] hover:bg-[#c5d7e8] transition-colors duration-200 rounded-xl px-5 py-3 h-12 min-w-[84px] max-w-[480px]"
              >
                <span className="font-bold text-[16px] leading-[24px] text-[#0f1417]">
                  경매 둘러보기
                </span>
              </button>
            </div>
          </div>

          {/* 실시간 경매 섹션 */}
          <div id="auctions-section" className="w-full pt-5 pb-3 px-4">
            <h2 className="font-bold text-[22px] leading-[28px] text-[#0f1417]">
              실시간 경매
            </h2>
          </div>
          
          <div className="w-full px-4">
            <div className="flex flex-row gap-3 overflow-x-auto">
              {ongoingAuctions.length > 0 ? (
                ongoingAuctions.map((auction) => (
                  <AuctionCard
                    key={auction.auctionId}
                    auction={auction}
                    timeLeft={timeLeft[auction.auctionId]}
                    isOngoing={true}
                  />
                ))
              ) : (
                <div className="flex-1 flex justify-center items-center h-48">
                  <p className="text-gray-500">진행 중인 경매가 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          {/* 예정된 경매 섹션 */}
          <div className="w-full pt-5 pb-3 px-4">
            <h2 className="font-bold text-[22px] leading-[28px] text-[#0f1417]">
              예정된 경매
            </h2>
          </div>
          
          <div className="w-full px-4">
            <div className="flex flex-row gap-3 overflow-x-auto">
              {upcomingAuctions.length > 0 ? (
                upcomingAuctions.map((auction) => (
                  <AuctionCard
                    key={auction.auctionId}
                    auction={auction}
                    timeLeft={timeLeft[auction.auctionId]}
                    isOngoing={false}
                  />
                ))
              ) : (
                <div className="flex-1 flex justify-center items-center h-48">
                  <p className="text-gray-500">예정된 경매가 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          {/* 인기 상품 섹션 */}
          <div className="w-full pt-5 pb-3 px-4">
            <h2 className="font-bold text-[22px] leading-[28px] text-[#0f1417]">
              인기 상품
            </h2>
          </div>
          
          <div className="w-full px-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-row gap-3 overflow-x-auto">
                {popularAuctions.length > 0 ? (
                  popularAuctions.map((auction) => (
                    <PopularCard
                      key={auction.auctionId}
                      auction={auction}
                    />
                  ))
                ) : (
                  <div className="flex-1 flex justify-center items-center h-48">
                    <p className="text-gray-500">인기 상품이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 경매 카드 컴포넌트 (실제 데이터만 사용)
const AuctionCard = ({
  auction,
  timeLeft,
  isOngoing,
}: {
  auction: any;
  timeLeft: string;
  isOngoing: boolean;
}) => {
  // 예정된 경매는 클릭 불가능하게 처리
  const cardContent = (
    <div className={`min-w-60 w-60 rounded-lg transition-shadow ${
      isOngoing 
        ? 'cursor-pointer hover:shadow-lg' 
        : 'cursor-default'
    }`}>
      <div className="flex flex-col gap-4 p-0">
        {/* 이미지 영역 - 항상 동일한 크기 유지 */}
        <div className="h-[135px] w-full rounded-xl bg-gray-200 overflow-hidden flex items-center justify-center relative">
          {auction.imageUrl && auction.imageUrl.trim() ? (
            <Image
              src={auction.imageUrl.startsWith('http') ? auction.imageUrl.trim() : `https://${auction.imageUrl.trim()}`}
              alt={auction.productName}
              width={240}
              height={135}
              className="w-full h-full object-cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 w-full h-full">
              <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
              </svg>
              <span className="text-xs">이미지 없음</span>
            </div>
          )}
          {/* 예정된 경매에는 이미지 위에 오버레이로 "시작 전" 표시 */}
          {!isOngoing && (
            <div className="absolute top-2 right-2 z-10">
              <span className="inline-block px-2 py-1 text-xs bg-yellow-500 text-white rounded-full font-medium shadow-sm">
                시작 전
              </span>
            </div>
          )}
          {/* 실시간 경매에는 이미지 위에 오버레이로 "진행중" 표시 */}
          {isOngoing && (
            <div className="absolute top-2 right-2 z-10">
              <span className="inline-block px-2 py-1 text-xs bg-red-500 text-white rounded-full font-medium shadow-sm">
                진행중
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <div>
            <h3 className="font-medium text-[16px] leading-[24px] text-[#0f1417]">
              {auction.productName}
            </h3>
          </div>
          <div>
            <p className="font-normal text-[14px] leading-[21px] text-[#5c738a]">
              {isOngoing ? (
                timeLeft ? `남은 시간: ${timeLeft}` : '시간 계산 중...'
              ) : (
                `시작 예정: ${dayjs(auction.startTime).format('MM월 DD일')}`
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // 진행 중인 경매만 클릭 가능
  if (isOngoing) {
    return (
      <Link href={`/auctions/${auction.auctionId}`}>
        {cardContent}
      </Link>
    );
  }

  // 예정된 경매는 클릭 불가능
  return cardContent;
};

// 인기 상품 카드 컴포넌트 (실제 데이터만 사용)
const PopularCard = ({
  auction,
}: {
  auction: any;
}) => (
  <Link href={`/auctions/${auction.auctionId}`}>
    <div className="h-full w-[301px] cursor-pointer hover:shadow-lg transition-shadow">
      <div className="flex flex-col gap-3 pb-3">
        {/* 이미지 영역 - 항상 표시 */}
        <div className="h-[169px] w-full rounded-xl bg-gray-200 overflow-hidden flex items-center justify-center">
          {auction.imageUrl && auction.imageUrl.trim() ? (
            <Image
              src={auction.imageUrl.startsWith('http') ? auction.imageUrl.trim() : `https://${auction.imageUrl.trim()}`}
              alt={auction.productName}
              width={301}
              height={169}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">이미지 없음</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <div>
            <h3 className="font-medium text-[16px] leading-[24px] text-[#0f1417]">
              {auction.productName}
            </h3>
          </div>
          <div>
            <p className="font-normal text-[14px] leading-[21px] text-[#5c738a]">
              현재 입찰가: {auction.currentBidAmount ? `${auction.currentBidAmount.toLocaleString()}원` : `${auction.startingBid?.toLocaleString() || 0}원`}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Link>
);
