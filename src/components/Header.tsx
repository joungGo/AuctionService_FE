"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { LogoutButton } from "@/components/auth/LogoutButton";

export function Header() {
  const { user, isLoading } = useAuth();

  // 로딩 중일 때는 빈 상태로 렌더링
  if (isLoading) {
    return (
      <header className="w-full bg-white border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Navigation - 완전히 왼쪽 정렬 */}
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900">
                GlobalBid
              </Link>
              <nav className="hidden md:flex space-x-8">
                <Link href="/" className="text-gray-600 hover:text-gray-900">
                  홈
                </Link>
                <Link href="/categories" className="text-gray-600 hover:text-gray-900">
                  카테고리
                </Link>
                <Link href="/my-bids" className="text-gray-600 hover:text-gray-900">
                  내 입찰
                </Link>
                <Link href="/wishlist" className="text-gray-600 hover:text-gray-900">
                  관심 목록
                </Link>
              </nav>
            </div>
            {/* Right Navigation - 완전히 오른쪽 정렬 */}
            <div className="flex items-center space-x-4">
              {/* 로딩 중 */}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full bg-white border-b">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Navigation - 완전히 왼쪽 정렬 */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              GlobalBid
            </Link>
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                홈
              </Link>
              <Link href="/categories" className="text-gray-600 hover:text-gray-900">
                카테고리
              </Link>
              <Link href="/my-bids" className="text-gray-600 hover:text-gray-900">
                내 입찰
              </Link>
              <Link href="/wishlist" className="text-gray-600 hover:text-gray-900">
                관심 목록
              </Link>
            </nav>
          </div>

          {/* Right Navigation - 완전히 오른쪽 정렬 */}
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="hidden md:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  className="w-64 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Auth Navigation */}
            {!user ? (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" className="text-gray-600 hover:text-gray-900">로그인</Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white">회원가입</Button>
                </Link>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-600">
                  안녕하세요, {user.nickname}님
                </span>
                <Link href="/mypage">
                  <Button variant="outline" className="text-gray-600 hover:text-gray-900">마이페이지</Button>
                </Link>
                <LogoutButton />
                
                {/* Profile Icon */}
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
