"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dayjs from "dayjs";
import { getApiBaseUrl } from "@/lib/config";

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
  currentBidAmount?: number;
  startingBid?: number;
}

// 검색 로직을 담은 별도 컴포넌트
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [filteredAuctions, setFilteredAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeLeft, setTimeLeft] = useState<{ [key: number]: string }>({});
  
  // 필터 상태
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // URL에서 검색어 가져오기
  useEffect(() => {
    const query = searchParams.get("q") || "";
    setSearchQuery(query);
  }, [searchParams]);

  // 경매 데이터 불러오기
  useEffect(() => {
    const fetchAuctions = async () => {
      setLoading(true);
      setError("");
      try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/auctions`);
        
        if (!response.ok) throw new Error("경매 목록 조회 실패");
        const data = await response.json();
        setAuctions(data.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();
  }, []);

  // 검색 필터링
  useEffect(() => {
    let filtered = auctions;

    // 검색어 필터링
    if (searchQuery.trim()) {
      filtered = filtered.filter(auction => 
        auction.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        auction.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 가격 필터링
    if (priceFilter) {
      const [minPrice, maxPrice] = priceFilter.split('-').map(p => parseInt(p.replace(/[^\d]/g, '')));
      filtered = filtered.filter(auction => {
        const price = auction.currentBid || auction.startPrice;
        return price >= minPrice && price <= maxPrice;
      });
    }

    // 상태 필터링
    if (statusFilter) {
      const now = dayjs();
      filtered = filtered.filter(auction => {
        const start = dayjs(auction.startTime);
        const end = dayjs(auction.endTime);
        
        switch (statusFilter) {
          case 'live':
            return now.isAfter(start) && now.isBefore(end);
          case 'upcoming':
            return now.isBefore(start);
          case 'ended':
            return now.isAfter(end);
          default:
            return true;
        }
      });
    }

    setFilteredAuctions(filtered);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  }, [searchQuery, auctions, priceFilter, statusFilter]);

  // 남은 시간 계산
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedTimes: { [key: number]: string } = {};
      const now = dayjs();

      filteredAuctions.forEach((auction) => {
        const start = dayjs(auction.startTime);
        const end = dayjs(auction.endTime);

        let targetTime;
        let status = "";
        
        if (now.isBefore(start)) {
          targetTime = start;
          status = "시작까지 ";
        } else if (now.isBefore(end)) {
          targetTime = end;
          status = "종료까지 ";
        } else {
          updatedTimes[auction.auctionId] = "경매 종료";
          return;
        }

        const diff = targetTime.diff(now);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let timeStr = status;
        if (days > 0) timeStr += `${days}일 `;
        if (hours > 0) timeStr += `${hours}시간 `;
        if (minutes > 0) timeStr += `${minutes}분 `;
        timeStr += `${seconds}초`;
        
        updatedTimes[auction.auctionId] = timeStr;
      });

      setTimeLeft(updatedTimes);
    }, 1000);

    return () => clearInterval(interval);
  }, [filteredAuctions]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredAuctions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAuctions = filteredAuctions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">검색 결과</h1>
        <p className="text-gray-600">
          {searchQuery ? `"${searchQuery}"에 대한 검색 결과 표시` : "엔티크에 대한 검색 결과 표시"}
        </p>
      </div>

      {/* 필터 영역 */}
      <div className="flex flex-wrap gap-4 mb-8">
        {/* 카테고리 필터 */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">카테고리: 엔티크</option>
            <option value="furniture">가구</option>
            <option value="jewelry">보석류</option>
            <option value="art">예술품</option>
            <option value="collectibles">수집품</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* 가격 범위 필터 */}
        <div className="relative">
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">가격 범위: ₩100,000 - ₩500,000</option>
            <option value="0-100000">₩0 - ₩100,000</option>
            <option value="100000-500000">₩100,000 - ₩500,000</option>
            <option value="500000-1000000">₩500,000 - ₩1,000,000</option>
            <option value="1000000-9999999">₩1,000,000 이상</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* 상태 필터 */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">상태: 종료</option>
            <option value="live">진행 중</option>
            <option value="upcoming">예정</option>
            <option value="ended">종료</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* 위치 필터 */}
        <div className="relative">
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">위치: 전 세계</option>
            <option value="kr">대한민국</option>
            <option value="us">미국</option>
            <option value="eu">유럽</option>
            <option value="asia">아시아</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">검색 중...</div>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-red-600">{error}</div>
        </div>
      )}

      {/* 검색 결과 */}
      {!loading && !error && (
        <>
          {currentAuctions.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {currentAuctions.map((auction) => (
                  <SearchResultCard
                    key={auction.auctionId}
                    auction={auction}
                    timeLeft={timeLeft[auction.auctionId]}
                  />
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    const isActive = page === currentPage;
                    
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-500 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                검색 결과가 없습니다
              </h3>
              <p className="text-gray-600 text-center">
                {searchQuery ? (
                  <>
                    "<span className="font-medium">{searchQuery}</span>"에 대한 검색 결과가 없습니다.<br />
                    다른 검색어를 시도해보세요.
                  </>
                ) : (
                  "검색어를 입력해주세요."
                )}
              </p>
              <Link
                href="/"
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                전체 경매 보기
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 메인 페이지 컴포넌트
export default function SearchPage() {
  return (
    <div className="bg-white min-h-screen">
      <Suspense fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">검색 결과</h1>
            <p className="text-gray-600">검색 결과를 불러오는 중...</p>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">로딩 중...</div>
          </div>
        </div>
      }>
        <SearchContent />
      </Suspense>
    </div>
  );
}

// 검색 결과 카드 컴포넌트
const SearchResultCard = ({ 
  auction, 
  timeLeft 
}: { 
  auction: Auction; 
  timeLeft: string; 
}) => {
  const getCurrentBid = () => {
    return auction.currentBid ?? auction.currentBidAmount ?? 0;
  };
  
  const getStartPrice = () => {
    return auction.startPrice ?? auction.startingBid ?? 0;
  };

  const now = dayjs();
  const start = dayjs(auction.startTime);
  const end = dayjs(auction.endTime);
  
  const isOngoing = now.isAfter(start) && now.isBefore(end);
  const isUpcoming = now.isBefore(start);
  const isFinished = now.isAfter(end);

  return (
    <Link href={`/auctions/${auction.auctionId}`}>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        {/* 이미지 */}
        <div className="h-48 w-full bg-gray-50 overflow-hidden flex items-center justify-center relative">
          {auction.imageUrl && auction.imageUrl.trim() ? (
            <Image
              src={auction.imageUrl.startsWith('http') ? auction.imageUrl.trim() : `https://${auction.imageUrl.trim()}`}
              alt={auction.productName}
              width={300}
              height={200}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 w-full h-full">
              <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2z" />
              </svg>
              <span className="text-sm">이미지 없음</span>
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="p-4">
          <h3 className="font-medium text-gray-900 mb-2 line-clamp-1">
            {auction.productName}
          </h3>
          
          <div className="text-sm text-gray-600 mb-3">
            현재 입찰가: <span className="font-semibold text-gray-900">
              ₩{getCurrentBid() > 0 ? getCurrentBid().toLocaleString() : getStartPrice().toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}; 