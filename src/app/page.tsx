"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/config";
import SlideContainer from "@/components/SlideContainer";
import InfiniteScrollCarousel from "@/components/InfiniteScrollCarousel";

// 히어로 섹션 배경 이미지만 유지 (UI 디자인 요소)
const imgHeroBackground = "http://localhost:3845/assets/c5a45c49b9693bc77cdfcadb467fef26dcfb67f1.png";

export default function AuctionPage() {
  const router = useRouter();
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
      console.log('[page.tsx] First auction object:', data.data?.[0]); // 첫 번째 경매 객체 구조 확인
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
    .slice(0, 6); // 슬라이드를 위해 더 많은 데이터 준비

  // 전체 경매 페이지로 이동
  const goToAllAuctions = () => {
    router.push('/auctions');
  };

  return (
    <div className="w-full">
      {/* 로딩 및 에러 상태 - 기존 로직 유지 */}
      {loading && (
        <div className="flex justify-center items-center h-64 bg-white">
          <p className="text-gray-600 text-lg">불러오는 중...</p>
        </div>
      )}
      {refreshing && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-full text-sm z-50 shadow-lg">
          🔄 갱신 중...
        </div>
      )}
      {error && (
        <div className="flex justify-center items-center h-64 bg-red-50">
          <p className="text-red-500 text-lg">{error}</p>
        </div>
      )}

      {/* 히어로 섹션 - 전체 화면 활용 */}
      <section 
        className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.6) 100%), url('${imgHeroBackground}')`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="font-black text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-tight text-white tracking-tight mb-6">
              특별한 상품을 만나보세요
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-8 leading-relaxed">
              실시간 경매에서 희귀하고 특별한 상품에 입찰하세요.<br className="hidden sm:block" />
              오늘 당신의 보물을 찾아보세요.
            </p>
            <button 
              onClick={goToAllAuctions}
              className="inline-flex items-center px-8 py-4 bg-white hover:bg-gray-100 text-gray-900 font-bold text-lg rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              경매 둘러보기
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* 스크롤 인디케이터 */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* 실시간 경매 섹션 */}
      <section className="w-full bg-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <div className="h-1 w-12 bg-red-500 rounded mr-4"></div>
              <h2 className="font-black text-3xl lg:text-4xl text-gray-900">실시간 경매</h2>
              <div className="h-1 w-12 bg-red-500 rounded ml-4"></div>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              지금 이 순간 진행 중인 경매에 참여하세요. 실시간으로 업데이트되는 입찰 현황을 확인할 수 있습니다.
            </p>
          </div>
          
          {ongoingAuctions.length > 0 ? (
            <SlideContainer autoSlideInterval={3000} className="px-4">
              {ongoingAuctions.map((auction) => (
                <AuctionCard
                  key={auction.auctionId}
                  auction={auction}
                  timeLeft={timeLeft[auction.auctionId]}
                  isOngoing={true}
      />
              ))}
            </SlideContainer>
          ) : (
            <div className="flex justify-center items-center h-48 bg-gray-50 rounded-2xl">
              <p className="text-gray-500 text-lg">진행 중인 경매가 없습니다.</p>
            </div>
          )}
        </div>
      </section>

      {/* 예정된 경매 섹션 */}
      <section className="w-full bg-gray-50 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <div className="h-1 w-12 bg-yellow-500 rounded mr-4"></div>
              <h2 className="font-black text-3xl lg:text-4xl text-gray-900">예정된 경매</h2>
              <div className="h-1 w-12 bg-yellow-500 rounded ml-4"></div>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              곧 시작될 경매를 미리 확인해보세요. 관심 있는 상품을 놓치지 마세요.
            </p>
    </div>
          
          {upcomingAuctions.length > 0 ? (
            <InfiniteScrollCarousel speed={48}>
              {upcomingAuctions.map((auction) => (
                <AuctionCard
                  key={auction.auctionId}
                  auction={auction}
                  timeLeft={timeLeft[auction.auctionId]}
                  isOngoing={false}
                />
              ))}
            </InfiniteScrollCarousel>
          ) : (
            <div className="flex justify-center items-center h-48 bg-white rounded-2xl">
              <p className="text-gray-500 text-lg">예정된 경매가 없습니다.</p>
            </div>
          )}
        </div>
      </section>

      {/* 인기 상품 섹션 */}
      <section className="w-full bg-gradient-to-b from-blue-50 to-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <div className="h-1 w-12 bg-blue-500 rounded mr-4"></div>
              <h2 className="font-black text-3xl lg:text-4xl text-gray-900">인기 상품</h2>
              <div className="h-1 w-12 bg-blue-500 rounded ml-4"></div>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              가장 높은 입찰가를 기록 중인 인기 상품들을 만나보세요. 프리미엄 아이템들이 기다리고 있습니다.
            </p>
          </div>
          
          {popularAuctions.length > 0 ? (
            <SlideContainer autoSlideInterval={4000} className="px-4">
              {popularAuctions.map((auction) => (
                <PopularCard
                  key={auction.auctionId}
                  auction={auction}
          />
              ))}
            </SlideContainer>
      ) : (
            <div className="flex justify-center items-center h-48 bg-white rounded-2xl">
              <p className="text-gray-500 text-lg">인기 상품이 없습니다.</p>
            </div>
      )}
    </div>
      </section>
  </div>
);
}

// 경매 카드 컴포넌트 (전체 화면 최적화)
const AuctionCard = ({
  auction,
  timeLeft,
  isOngoing,
}: {
  auction: any;
  timeLeft: string;
  isOngoing: boolean;
}) => {
  // 🔧 필드명 통일 처리 - 상세 페이지와 동일한 필드명 우선 사용
  const getCurrentBid = () => {
    return auction.currentBid ?? auction.currentBidAmount ?? 0;
  };
  
  const getStartPrice = () => {
    return auction.startPrice ?? auction.startingBid ?? 0;
  };

  const cardContent = (
    <div className={`w-full rounded-2xl overflow-hidden transition-all duration-300 ${
      isOngoing 
        ? 'cursor-pointer hover:shadow-2xl hover:scale-105' 
        : 'cursor-default hover:shadow-lg'
    } bg-white shadow-lg`}>
      <div className="relative">
        {/* 이미지 영역 - 더 큰 크기로 최적화 */}
        <div className="h-[200px] sm:h-[220px] w-full bg-gray-200 overflow-hidden flex items-center justify-center relative">
          {auction.imageUrl && auction.imageUrl.trim() ? (
            <Image
              src={auction.imageUrl.startsWith('http') ? auction.imageUrl.trim() : `https://${auction.imageUrl.trim()}`}
              alt={auction.productName}
              width={400}
              height={220}
              className="w-full h-full object-cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 w-full h-full">
              <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">이미지 없음</span>
            </div>
          )}
          
          {/* 상태 배지 */}
          {isOngoing && (
            <div className="absolute top-3 right-3 z-10">
              <span className="inline-flex items-center px-3 py-1 text-xs font-bold bg-red-500 text-white rounded-full shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                진행중
              </span>
            </div>
          )}
          {!isOngoing && (
            <div className="absolute top-3 right-3 z-10">
              <span className="inline-flex items-center px-3 py-1 text-xs font-bold bg-yellow-500 text-white rounded-full shadow-lg">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                시작 전
              </span>
            </div>
          )}
        </div>
        
        {/* 컨텐츠 영역 */}
        <div className="p-4 sm:p-5">
          <h3 className="font-bold text-lg sm:text-xl text-gray-900 mb-2 line-clamp-2">
            {auction.productName}
          </h3>
          <p className="text-sm sm:text-base text-gray-600">
        {isOngoing ? (
              timeLeft ? `⏰ 남은 시간: ${timeLeft}` : '⏰ 시간 계산 중...'
            ) : (
              `📅 시작 예정: ${dayjs(auction.startTime).format('MM월 DD일')}`
            )}
          </p>
          {isOngoing && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">현재 입찰가</p>
              <p className="font-bold text-lg text-blue-600">
                {/* 🔧 필드명 통일: 상세 페이지와 동일한 로직 사용 */}
                {(getCurrentBid() || getStartPrice()).toLocaleString()}원
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isOngoing) {
    return (
      <Link href={`/auctions/${auction.auctionId}`}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};

// 인기 상품 카드 컴포넌트 (전체 화면 최적화)
const PopularCard = ({
  auction,
}: {
  auction: any;
}) => {
  // 🔧 필드명 통일 처리 - 상세 페이지와 동일한 필드명 우선 사용
  const getCurrentBid = () => {
    return auction.currentBid ?? auction.currentBidAmount ?? 0;
  };
  
  const getStartPrice = () => {
    return auction.startPrice ?? auction.startingBid ?? 0;
  };

  return (
    <Link href={`/auctions/${auction.auctionId}`}>
      <div className="w-full cursor-pointer hover:shadow-2xl hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden bg-white shadow-lg">
        <div className="relative">
          {/* 이미지 영역 - 인기 상품용 더 큰 크기 */}
          <div className="h-[240px] sm:h-[260px] w-full bg-gray-200 overflow-hidden flex items-center justify-center relative">
            {auction.imageUrl && auction.imageUrl.trim() ? (
          <Image
            src={auction.imageUrl.startsWith('http') ? auction.imageUrl.trim() : `https://${auction.imageUrl.trim()}`}
            alt={auction.productName}
                width={450}
                height={260}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400 w-full h-full">
                <svg className="w-20 h-20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                </svg>
                <span className="text-base font-medium">이미지 없음</span>
        </div>
      )}

            {/* 인기 상품 배지 */}
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center px-3 py-1 text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                인기
        </span>
            </div>
          </div>
          
          {/* 컨텐츠 영역 */}
          <div className="p-4 sm:p-5">
            <h3 className="font-bold text-lg sm:text-xl text-gray-900 mb-3 line-clamp-2">
              {auction.productName}
            </h3>
            <div className="space-y-2">
              <p className="text-xs text-gray-500">현재 입찰가</p>
              <p className="font-black text-xl sm:text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {/* 🔧 필드명 통일: 상세 페이지와 동일한 로직 사용 */}
                {(getCurrentBid() || getStartPrice()).toLocaleString()}원
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                높은 관심도
              </div>
            </div>
          </div>
        </div>
      </div>
        </Link>
  );
};
