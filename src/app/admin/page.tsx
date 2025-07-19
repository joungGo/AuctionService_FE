"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">관리자 대시보드</h1>
        <p className="text-gray-600 mt-2">경매 서비스 관리 도구</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 경매 관리 */}
        <Link href="/admin/auctions">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🏷️</span>
                경매 관리
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                새로운 경매를 등록하고 기존 경매를 관리합니다.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 카테고리 관리 */}
        <Link href="/admin/categories">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📂</span>
                카테고리 관리
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                카테고리를 추가, 수정, 삭제하여 경매 분류를 관리합니다.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 경매 목록 */}
        <Link href="/admin/auctions/list">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📋</span>
                경매 목록
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                등록된 모든 경매를 조회하고 관리합니다.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
} 