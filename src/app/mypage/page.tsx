"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { getApiBaseUrl } from "@/lib/config";
import { getMyAuctionHistory, getMyFavorites, addFavorite, removeFavorite } from '@/lib/api/auction';

interface User {
  nickname: string;
  email: string;
  profileImage?: string;
}

interface Auction {
  auctionId: number;
  productName: string;
  description?: string;
  winningBid: number;
  winTime: string;
  imageUrl?: string;
}

// 입찰 내역 인터페이스 수정 (API 응답에 맞게)
interface AuctionHistory {
  auctionId: number;
  productName: string;
  imageUrl?: string;
  status: '진행중' | '낙찰' | '패찰';
  myLastBidAmount?: number;
  myHighestBidAmount?: number;
  auctionHighestBidAmount?: number;
  endTime?: string;
  isWinner?: boolean;
}

// 관심 목록 인터페이스 추가
interface WishlistItem {
  auctionId: number;
  productName: string;
  description?: string;
  currentBid: number;
  imageUrl?: string;
  endTime: string;
}

// 관심 목록 인터페이스 수정 (API 응답에 맞게)
interface Favorite {
  favoriteId: number;
  auctionId: number;
  productName: string;
  imageUrl?: string;
  createdAt?: string;
}

export default function MyPage() {
  const { userUUID } = useParams();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [auctionHistory, setAuctionHistory] = useState<AuctionHistory[]>([]);
  const [wishlist, setWishlist] = useState<Favorite[]>([]);
  const [activeSection, setActiveSection] = useState<'won' | 'bids' | 'wishlist' | 'settings'>('won');
  const [activeBidTab, setActiveBidTab] = useState<'진행중' | '낙찰' | '패찰'>('진행중');
  const API_BASE_URL = getApiBaseUrl();

  useEffect(() => {
    // AuthContext에서 사용자 정보를 가져오거나 URL 파라미터 사용
    let uuid = userUUID || authUser?.userUUID;
    if (!uuid) {
      router.push("/auth/login");
      return;
    }

    console.log("현재 userUUID 값:", uuid);

    const headers = {
      "Content-Type": "application/json"
    };

    // 사용자 정보 가져오기
    fetch(`${API_BASE_URL}/auth/users/${uuid}`, {
      headers,
      credentials: 'include'
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => data?.data && setUser(data.data))
      .catch(console.error);

    // 낙찰 받은 경매 목록 가져오기
    fetch(`${API_BASE_URL}/auctions/${uuid}/winner`, {
      headers,
      credentials: 'include'
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => data?.data && Array.isArray(data.data) ? setAuctions(data.data) : [])
      .catch(console.error);

    // 입찰한 경매 목록 API 연동
    getMyAuctionHistory()
      .then((data) => {
        console.log('getMyAuctionHistory 응답:', data);
        if (data?.data && Array.isArray(data.data)) {
          setAuctionHistory(data.data);
        } else {
          setAuctionHistory([]);
        }
      })
      .catch((error) => {
        console.error('입찰한 경매 목록 조회 실패:', error);
        setAuctionHistory([]);
      });

    // 관심 목록 API 연동
    getMyFavorites()
      .then((data) => {
        if (data?.data && Array.isArray(data.data)) {
          setWishlist(data.data);
        } else {
          setWishlist([]);
        }
      })
      .catch((error) => {
        console.error('관심 목록 조회 실패:', error);
        setWishlist([]);
      });
  }, [userUUID, authUser, router]);

  // 관심 경매 해제 핸들러
  const handleRemoveFavorite = async (auctionId: number) => {
    try {
      await removeFavorite(auctionId);
      // 해제 후 목록 갱신
      const data = await getMyFavorites();
      setWishlist(data?.data || []);
    } catch (error) {
      alert('찜 해제에 실패했습니다.');
    }
  };

  // 상태별 필터링
  const filteredAuctionHistory = auctionHistory.filter(
    (auction) => auction.status === activeBidTab
  );

  return (
    <div className="bg-white min-h-screen flex">
      {/* 사이드바 */}
      <div className="w-80 bg-[#f7fafc] min-h-[800px] p-4">
        {/* 프로필 정보 - 기존 기능 그대로 유지 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[20px] overflow-hidden bg-gray-300">
            <img src={user?.profileImage || "/default-profile.png"} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <p className="font-medium text-[16px] leading-[24px] text-[#0d141c]">
              {user?.nickname || "김민지"}
            </p>
            <p className="text-[14px] leading-[21px] text-[#4a739c]">
              @{user?.email?.split('@')[0] || "minji.kim"}
            </p>
          </div>
        </div>

        {/* 수정 버튼 - 기존 기능 유지 */}
        <button 
          className="w-full mb-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          onClick={() => router.push("/mypage/edit")}
        >
          프로필 수정
        </button>

        {/* 네비게이션 메뉴 */}
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 rounded-lg"
          >
            <div className="w-6 h-6">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-medium text-[14px] leading-[21px] text-[#0d141c]">홈</span>
          </button>

          <button 
            onClick={() => setActiveSection('wishlist')}
            className={`flex items-center gap-3 px-3 py-2 text-left rounded-[20px] ${
              activeSection === 'wishlist' ? 'bg-[#e8edf5]' : 'hover:bg-gray-100'
            }`}
          >
            <div className="w-6 h-6">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-medium text-[14px] leading-[21px] text-[#0d141c]">관심 목록</span>
          </button>

          <button 
            onClick={() => setActiveSection('bids')}
            className={`flex items-center gap-3 px-3 py-2 text-left rounded-lg ${
              activeSection === 'bids' ? 'bg-[#e8edf5]' : 'hover:bg-gray-100'
            }`}
          >
            <div className="w-6 h-6">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-medium text-[14px] leading-[21px] text-[#0d141c]">입찰 내역</span>
          </button>

          <button 
            onClick={() => setActiveSection('won')}
            className={`flex items-center gap-3 px-3 py-2 text-left rounded-lg ${
              activeSection === 'won' ? 'bg-[#e8edf5]' : 'hover:bg-gray-100'
            }`}
          >
            <div className="w-6 h-6">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-medium text-[14px] leading-[21px] text-[#0d141c]">낙찰 받은 경매</span>
          </button>

          <button 
            onClick={() => setActiveSection('settings')}
            className={`flex items-center gap-3 px-3 py-2 text-left rounded-[20px] ${
              activeSection === 'settings' ? 'bg-[#e8edf5]' : 'hover:bg-gray-100'
            }`}
          >
            <div className="w-6 h-6">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-medium text-[14px] leading-[21px] text-[#0d141c]">설정</span>
          </button>
        </div>
      </div>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 max-w-[960px] p-6">
        {/* 설정 섹션 */}
        {activeSection === 'settings' && (
          <div>
            <h2 className="font-bold text-[32px] leading-[40px] text-[#0d141c] mb-6">설정</h2>
            
            {/* 계정 설정 */}
            <div className="mb-6">
              <h3 className="font-bold text-[18px] leading-[23px] text-[#0d141c] mb-2 px-4">계정 설정</h3>
              
              <button 
                onClick={() => router.push('/mypage/edit')}
                className="bg-[#f7fafc] h-[72px] w-full flex items-center px-4 py-2 hover:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col justify-center">
                  <p className="font-medium text-[16px] leading-[24px] text-[#0d141c] text-left">이메일 주소</p>
                  <p className="text-[14px] leading-[21px] text-[#4a739c] text-left">이메일 주소 변경</p>
                </div>
              </button>
              
              <button 
                onClick={() => router.push('/mypage/edit')}
                className="bg-[#f7fafc] h-[72px] w-full flex items-center px-4 py-2 hover:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col justify-center">
                  <p className="font-medium text-[16px] leading-[24px] text-[#0d141c] text-left">비밀번호</p>
                  <p className="text-[14px] leading-[21px] text-[#4a739c] text-left">비밀번호 변경</p>
                </div>
              </button>
            </div>

            {/* 알림 설정 */}
            <div className="mb-6">
              <h3 className="font-bold text-[18px] leading-[23px] text-[#0d141c] mb-2 px-4">알림 설정</h3>
              
              <button className="bg-[#f7fafc] h-[72px] w-full flex items-center px-4 py-2 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col justify-center">
                  <p className="font-medium text-[16px] leading-[24px] text-[#0d141c] text-left">경매 알림</p>
                  <p className="text-[14px] leading-[21px] text-[#4a739c] text-left">경매 알림 설정</p>
                </div>
              </button>
              
              <button className="bg-[#f7fafc] h-[72px] w-full flex items-center px-4 py-2 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col justify-center">
                  <p className="font-medium text-[16px] leading-[24px] text-[#0d141c] text-left">관심 목록 알림</p>
                  <p className="text-[14px] leading-[21px] text-[#4a739c] text-left">관심 목록 알림 설정</p>
                </div>
              </button>
            </div>

            {/* 개인 정보 관리 */}
            <div className="mb-6">
              <h3 className="font-bold text-[18px] leading-[23px] text-[#0d141c] mb-2 px-4">개인 정보 관리</h3>
              
              <button 
                onClick={() => router.push('/mypage/edit')}
                className="bg-[#f7fafc] h-[72px] w-full flex items-center px-4 py-2 hover:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col justify-center">
                  <p className="font-medium text-[16px] leading-[24px] text-[#0d141c] text-left">개인 정보</p>
                  <p className="text-[14px] leading-[21px] text-[#4a739c] text-left">개인 정보 수정</p>
                </div>
              </button>
              
              <button className="bg-[#f7fafc] h-[72px] w-full flex items-center px-4 py-2 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col justify-center">
                  <p className="font-medium text-[16px] leading-[24px] text-[#0d141c] text-left">결제 정보</p>
                  <p className="text-[14px] leading-[21px] text-[#4a739c] text-left">결제 정보 관리</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 관심 목록 섹션 */}
        {activeSection === 'wishlist' && (
          <div>
            <h2 className="font-bold text-[32px] leading-[40px] text-[#0d141c] mb-6">관심 목록</h2>
            <div className="space-y-0">
              {wishlist.length > 0 ? (
                wishlist.map((item) => (
                  <div key={item.favoriteId} className="bg-[#f7fafc] min-h-[72px] flex items-center">
                    <div className="flex items-center gap-4 px-4 py-2 w-full">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        <img
                          src={item.imageUrl || "/default-image.jpg"}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                          onError={e => {
                            if (e.currentTarget.src.endsWith('/default-image.jpg')) return;
                            e.currentTarget.src = '/default-image.jpg';
                          }}
                        />
                      </div>
                      <div className="flex flex-col justify-center flex-1">
                        <p className="font-medium text-[16px] leading-[24px] text-[#0d141c] whitespace-nowrap mb-1">
                          {item.productName}
                        </p>
                        <p className="text-[12px] text-[#4a739c] mt-1">
                          찜 등록일: {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
                        </p>
                      </div>
                      <button
                        className="ml-4 text-red-500 hover:text-red-700 text-xl"
                        title="찜 해제"
                        onClick={() => handleRemoveFavorite(item.auctionId)}
                      >
                        ♥
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[#4a739c] mt-4 text-center">관심 목록이 비어있습니다.</p>
              )}
            </div>
          </div>
        )}

        {/* 낙찰 받은 경매 섹션 */}
        {activeSection === 'won' && (
          <div>
            <h2 className="font-bold text-[32px] leading-[40px] text-[#0d141c] mb-6">낙찰 받은 경매</h2>
            <div className="flex flex-col gap-4">
              {auctions.length > 0 ? (
                auctions.map((auction) => (
                  <div key={auction.auctionId} className="relative flex border rounded-lg p-4 shadow gap-4 bg-[#f7fafc]">
                    {/* 이미지 영역 (가로 길이 늘리기) - 기존 크기 유지 */}
                    <div className="w-60 h-40 bg-gray-200 overflow-hidden rounded-lg flex-shrink-0">
                      <img
                        src={auction.imageUrl || "/default-image.jpg"}
                        alt={auction.productName}
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.src = "/default-image.jpg")}
                      />
                    </div>

                    {/* 상품 정보 영역 - 기존 정보 모두 유지 */}
                    <div className="flex flex-col justify-center flex-1 relative">
                      {/* 오른쪽 상단 결제 대기중 표시 - 기존 기능 유지 */}
                      <p className="absolute right-2 top-2 text-red-500 text-sm font-semibold">결제 대기중</p>

                      <p className="font-medium text-[16px] leading-[24px] text-[#0d141c] mb-2">{auction.productName}</p>
                      <p className="text-[14px] leading-[21px] text-[#4a739c] mb-1">{auction.description || "설명 없음"}</p>
                      <p className="text-[14px] leading-[21px] text-[#4a739c] mb-2">{new Date(auction.winTime).toLocaleString()}</p>
                      <p className="text-blue-500 font-bold">낙찰가: ₩{auction.winningBid.toLocaleString()}원</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[#4a739c] mt-4 text-center">낙찰 받은 경매가 없습니다.</p>
              )}
            </div>
          </div>
        )}

        {/* 입찰 내역 섹션 */}
        {activeSection === 'bids' && (
          <div>
            <h2 className="font-bold text-[32px] leading-[40px] text-[#0d141c] mb-6">입찰 내역</h2>
            {/* 입찰 내역 탭 메뉴 */}
            <div className="border-b border-[#d4dbe3] mb-4">
              <div className="flex gap-8">
                {['진행중', '낙찰', '패찰'].map((label) => (
                  <button
                    key={label}
                    onClick={() => setActiveBidTab(label as '진행중' | '낙찰' | '패찰')}
                    className={`px-0 py-4 text-[14px] font-bold leading-[21px] border-b-3 ${
                      activeBidTab === label
                        ? 'text-[#0d141c] border-[#e5e8eb]'
                        : 'text-[#4a739c] border-transparent hover:border-[#e5e8eb]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* 입찰 내역 목록 */}
            <div className="space-y-0">
              {filteredAuctionHistory.length > 0 ? (
                filteredAuctionHistory.map((auction) => (
                  <div key={auction.auctionId} className="bg-[#f7fafc] min-h-[72px] flex items-center">
                    <div className="flex items-center gap-4 px-4 py-2 w-full">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        <img
                          src={auction.imageUrl || "/default-image.jpg"}
                          alt={auction.productName}
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.src = "/default-image.jpg")}
                        />
                      </div>
                      <div className="flex flex-col justify-center flex-1">
                        <p className="font-medium text-[16px] leading-[24px] text-[#0d141c] whitespace-nowrap mb-1">
                          {auction.productName}
                        </p>
                        <div className="flex gap-4 text-[14px] leading-[21px] text-[#4a739c]">
                          <span>내 마지막 입찰가: ₩{auction.myLastBidAmount?.toLocaleString() ?? '-'}</span>
                          <span>내 최고 입찰가: ₩{auction.myHighestBidAmount?.toLocaleString() ?? '-'}</span>
                          <span>경매 최고가: ₩{auction.auctionHighestBidAmount?.toLocaleString() ?? '-'}</span>
                          <span className={`font-semibold ${
                            auction.status === '낙찰' ? 'text-green-600' : 
                            auction.status === '패찰' ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {auction.status}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#4a739c] mt-1">
                          종료 시간: {auction.endTime ? new Date(auction.endTime).toLocaleString() : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[#4a739c] mt-4 text-center">
                  {activeBidTab === '진행중' ? '진행중인 입찰이 없습니다.' : 
                   activeBidTab === '낙찰' ? '낙찰한 입찰이 없습니다.' : '패찰한 입찰이 없습니다.'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
