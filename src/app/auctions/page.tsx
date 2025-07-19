"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";
import dayjs from "dayjs";
import { useSearchParams, useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/config";
import { getAllAuctions } from "@/lib/api/auction";
import CategoryFilter from "@/components/auction/CategoryFilter";

export default function AllAuctionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState<{ [key: number]: string }>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // URL 파라미터에서 카테고리 ID 읽기
  useEffect(() => {
    const categoryId = searchParams.get('category');
    if (categoryId) {
      setSelectedCategoryId(parseInt(categoryId));
    } else {
      setSelectedCategoryId(null);
    }
  }, [searchParams]);

  // 카테고리 변경 시 URL 업데이트
  const handleCategoryChange = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    const params = new URLSearchParams(searchParams);
    if (categoryId) {
      params.set('category', categoryId.toString());
    } else {
      params.delete('category');
    }
    router.push(`/auctions?${params.toString()}`);
  };

  // ✅ 경매 데이터 불러오기 - 카테고리 필터링 지원
  const fetchAuctions = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError("");
    try {
      const data = await getAllAuctions(selectedCategoryId || undefined);
      console.log('[AllAuctions] Response data:', data);
      setAuctions(data.data);
    } catch (err: any) {
      console.error('[AllAuctions] Fetch error:', err);
      setError(err.message);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  // ✅ 최초 호출 및 주기적 갱신 - 카테고리 변경 시에도 갱신
  useEffect(() => {
    fetchAuctions(true);
    const interval = setInterval(() => {
      console.log("🔄 전체 경매 페이지 갱신 중...");
      fetchAuctions(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedCategoryId]);

  // ✅ 남은 시간 계산 - 메인 페이지와 동일
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

  // 필터링 - 메인 페이지와 동일하지만 제한 없음
  const now = dayjs();
  const ongoingAuctions = auctions.filter(
    (a) => now.isAfter(dayjs(a.startTime)) && now.isBefore(dayjs(a.endTime))
  );
  const upcomingAuctions = auctions.filter((a) => now.isBefore(dayjs(a.startTime)));
  const popularAuctions = auctions
    .filter(auction => auction.currentBidAmount || auction.startingBid)
    .sort((a, b) => {
      const priceA = a.currentBidAmount || a.startingBid || 0;
      const priceB = b.currentBidAmount || b.startingBid || 0;
      return priceB - priceA;
    });
    // slice 제거 - 모든 인기 상품 표시

  return (
    <div className="bg-neutral-50 min-h-[800px] w-full">
      {/* 로딩 및 에러 상태 */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-600">경매 목록을 불러오는 중...</p>
          </div>
        </div>
      )}
      {refreshing && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-full text-sm z-50 shadow-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>갱신 중...</span>
        </div>
      )}
      {error && (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-500 text-2xl">⚠️</span>
            </div>
            <p className="text-red-500 text-center">{error}</p>
            <button 
              onClick={() => fetchAuctions(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <div className="flex flex-row justify-center w-full">
        <div className="flex flex-col items-start justify-start w-full max-w-[1200px] px-4 lg:px-8 py-8">
          
          {/* 페이지 헤더 */}
          <div className="w-full mb-8">
            <div className="flex items-center justify-between">
              <h1 className="font-bold text-[32px] leading-[40px] text-[#0f1417]">
                전체 경매
              </h1>
              <Link 
                href="/"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
              >
                메인으로 돌아가기
              </Link>
            </div>
            <p className="text-gray-600 mt-2">모든 경매를 한 눈에 확인하세요</p>
          </div>

          {/* 카테고리 필터 */}
          <CategoryFilter 
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={handleCategoryChange}
          />

          {/* 실시간 경매 섹션 */}
          <AllAuctionSection
            title="실시간 경매"
            auctions={ongoingAuctions}
            timeLeft={timeLeft}
            isOngoing={true}
            emptyMessage="진행 중인 경매가 없습니다."
          />

          {/* 예정된 경매 섹션 */}
          <AllAuctionSection
            title="예정된 경매"
            auctions={upcomingAuctions}
            timeLeft={timeLeft}
            isOngoing={false}
            emptyMessage="예정된 경매가 없습니다."
          />

          {/* 인기 상품 섹션 */}
          <PopularAuctionSection
            title="인기 상품"
            auctions={popularAuctions}
            emptyMessage="인기 상품이 없습니다."
          />
        </div>
      </div>
    </div>
  );
}

// 전체 경매 섹션 컴포넌트
const AllAuctionSection = ({
  title,
  auctions,
  timeLeft,
  isOngoing,
  emptyMessage
}: {
  title: string;
  auctions: any[];
  timeLeft: { [key: number]: string };
  isOngoing: boolean;
  emptyMessage: string;
}) => (
  <div className="w-full mb-12">
    <div className="mb-6">
      <h2 className="font-bold text-[24px] leading-[30px] text-[#0f1417] mb-2">
        {title}
      </h2>
      <div className="h-1 w-16 bg-blue-500 rounded"></div>
    </div>
    
    {auctions.length > 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {auctions.map((auction) => (
          <AuctionCard
            key={auction.auctionId}
            auction={auction}
            timeLeft={timeLeft[auction.auctionId]}
            isOngoing={isOngoing}
          />
        ))}
      </div>
    ) : (
      <div className="flex justify-center items-center h-32 bg-white rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <span className="text-gray-400 text-2xl">📦</span>
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    )}
  </div>
);

// 인기 상품 섹션 컴포넌트
const PopularAuctionSection = ({
  title,
  auctions,
  emptyMessage
}: {
  title: string;
  auctions: any[];
  emptyMessage: string;
}) => (
  <div className="w-full mb-12">
    <div className="mb-6">
      <h2 className="font-bold text-[24px] leading-[30px] text-[#0f1417] mb-2">
        {title}
      </h2>
      <div className="h-1 w-16 bg-green-500 rounded"></div>
    </div>
    
    {auctions.length > 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {auctions.map((auction) => (
          <PopularCard
            key={auction.auctionId}
            auction={auction}
          />
        ))}
      </div>
    ) : (
      <div className="flex justify-center items-center h-32 bg-white rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <span className="text-gray-400 text-2xl">🏆</span>
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    )}
  </div>
);

// 기존 AuctionCard 컴포넌트와 동일 (재사용)
const AuctionCard = ({
  auction,
  timeLeft,
  isOngoing,
}: {
  auction: any;
  timeLeft: string;
  isOngoing: boolean;
}) => {
  const cardContent = (
    <div className={`w-full rounded-lg transition-shadow ${
      isOngoing 
        ? 'cursor-pointer hover:shadow-lg' 
        : 'cursor-pointer hover:shadow-lg'
    }`}>
      <div className="flex flex-col gap-4 p-0">
        <div className="h-[180px] w-full rounded-xl bg-gray-200 overflow-hidden flex items-center justify-center relative">
          {auction.imageUrl && auction.imageUrl.trim() ? (
            <Image
              src={auction.imageUrl.startsWith('http') ? auction.imageUrl.trim() : `https://${auction.imageUrl.trim()}`}
              alt={auction.productName}
              width={300}
              height={180}
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
          {/* 카테고리 배지 */}
          {auction.categoryName && (
            <div className="absolute top-2 left-2 z-10">
              <span className="inline-block px-2 py-1 text-xs bg-blue-500 text-white rounded-full font-medium shadow-sm flex items-center gap-1">
                <span>{getCategoryIcon(auction.categoryName)}</span>
                <span>{auction.categoryName}</span>
              </span>
            </div>
          )}
          {isOngoing && (
            <div className="absolute top-2 right-2 z-10">
              <span className="inline-block px-2 py-1 text-xs bg-red-500 text-white rounded-full font-medium shadow-sm">
                진행중
              </span>
            </div>
          )}
          {!isOngoing && (
            <div className="absolute top-2 right-2 z-10">
              <span className="inline-block px-2 py-1 text-xs bg-yellow-500 text-white rounded-full font-medium shadow-sm">
                시작 전
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 px-2 pb-2">
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

  // 진행 중/예정 경매 모두 상세페이지로 이동 가능하게 Link로 감쌈
  return (
    <Link href={`/auctions/${auction.auctionId}`}>
      {cardContent}
    </Link>
  );
};

// 기존 PopularCard 컴포넌트와 동일 (재사용)
const PopularCard = ({
  auction,
}: {
  auction: any;
}) => (
  <Link href={`/auctions/${auction.auctionId}`}>
    <div className="w-full cursor-pointer hover:shadow-lg transition-shadow rounded-lg">
      <div className="flex flex-col gap-3 pb-3">
        <div className="h-[200px] w-full rounded-xl bg-gray-200 overflow-hidden flex items-center justify-center relative">
          {auction.imageUrl && auction.imageUrl.trim() ? (
            <Image
              src={auction.imageUrl.startsWith('http') ? auction.imageUrl.trim() : `https://${auction.imageUrl.trim()}`}
              alt={auction.productName}
              width={350}
              height={200}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 w-full h-full">
              <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">이미지 없음</span>
            </div>
          )}
          {/* 카테고리 배지 */}
          {auction.categoryName && (
            <div className="absolute top-2 left-2 z-10">
              <span className="inline-block px-2 py-1 text-xs bg-blue-500 text-white rounded-full font-medium shadow-sm flex items-center gap-1">
                <span>{getCategoryIcon(auction.categoryName)}</span>
                <span>{auction.categoryName}</span>
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 px-2">
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