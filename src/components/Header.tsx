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
            <div className="flex items-center space-x-4 lg:space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900 whitespace-nowrap">
                GlobalBid
              </Link>
              <nav className="hidden lg:flex space-x-4 xl:space-x-8">
                <Link href="/" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
                  홈
                </Link>
                <Link href="/categories" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
                  카테고리
                </Link>
                <Link href="/my-bids" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
                  내 입찰
                </Link>
                <Link href="/wishlist" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
                  관심 목록
                </Link>
              </nav>
              
              {/* 모바일 햄버거 메뉴 버튼 */}
              <button className="lg:hidden p-2 text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            {/* Right Navigation - 완전히 오른쪽 정렬 */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* 로딩 중 */}
              <div className="animate-pulse">
                <div className="h-8 w-20 lg:w-32 bg-gray-200 rounded"></div>
              </div>
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
          <div className="flex items-center space-x-4 lg:space-x-8">
            <Link href="/" className="text-xl font-bold text-gray-900 whitespace-nowrap">
              GlobalBid
            </Link>
            <nav className="hidden lg:flex space-x-4 xl:space-x-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
                홈
              </Link>
              <Link href="/categories" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
                카테고리
              </Link>
              <Link href="/my-bids" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
                내 입찰
              </Link>
              <Link href="/wishlist" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
                관심 목록
              </Link>
            </nav>
            
            {/* 모바일 햄버거 메뉴 버튼 */}
            <button className="lg:hidden p-2 text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Right Navigation - 완전히 오른쪽 정렬 */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            {/* Search Bar */}
            <div className="hidden lg:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  className="w-48 xl:w-64 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 모바일 검색 버튼 */}
            <button className="lg:hidden p-2 text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Auth Navigation */}
            {!user ? (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" className="text-gray-600 hover:text-gray-900 text-sm lg:text-base whitespace-nowrap">로그인</Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white text-sm lg:text-base whitespace-nowrap">회원가입</Button>
                </Link>
              </>
            ) : (
              <>
                <span className="hidden lg:inline text-sm text-gray-600 whitespace-nowrap">
                  안녕하세요, {user.nickname}님
                </span>
                <Link href="/mypage">
                  <Button variant="outline" className="text-gray-600 hover:text-gray-900 text-sm lg:text-base whitespace-nowrap">마이페이지</Button>
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
