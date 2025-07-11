"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { getApiBaseUrl } from "@/lib/config";

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

export default function MyPage() {
  const { userUUID } = useParams();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
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
  }, [userUUID, authUser, router]);

  return (
    <div className="bg-white min-h-screen flex">
      {/* 사이드바 */}
      <div className="w-80 bg-neutral-50 min-h-[800px] p-4">
        {/* 프로필 정보 - 기존 기능 그대로 유지 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[20px] overflow-hidden bg-gray-300">
            <img src={user?.profileImage || "/default-profile.png"} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <p className="font-medium text-[16px] leading-[24px] text-[#0f1417]">
              {user?.nickname || "닉네임"}
            </p>
            <p className="text-[14px] leading-[21px] text-[#5c738a]">
              {user?.email || "email@example.com"}
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
            <span className="font-medium text-[14px] leading-[21px] text-[#0f1417]">홈</span>
          </button>

          <div className="bg-[#ebedf2] rounded-xl">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-6 h-6">
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-medium text-[14px] leading-[21px] text-[#0f1417]">입찰 내역</span>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 max-w-[960px] p-6">
        {/* 낙찰 받은 경매 목록 - 기존 기능 그대로 유지 */}
        <h2 className="font-bold text-[32px] leading-[40px] text-[#0f1417] mb-6">낙찰 받은 경매</h2>
        <div className="flex flex-col gap-4">
          {auctions.length > 0 ? (
            auctions.map((auction) => (
              <div key={auction.auctionId} className="relative flex border rounded-lg p-4 shadow gap-4 bg-neutral-50">
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

                  <p className="font-medium text-[16px] leading-[24px] text-[#0f1417] mb-2">{auction.productName}</p>
                  <p className="text-[14px] leading-[21px] text-[#5c738a] mb-1">{auction.description || "설명 없음"}</p>
                  <p className="text-[14px] leading-[21px] text-[#5c738a] mb-2">{new Date(auction.winTime).toLocaleString()}</p>
                  <p className="text-blue-500 font-bold">낙찰가: ₩{auction.winningBid.toLocaleString()}원</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-[#5c738a] mt-4 text-center">낙찰 받은 경매가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
