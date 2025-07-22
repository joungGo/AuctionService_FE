// src/app/admin/auctions/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { getApiBaseUrl } from "@/lib/config";
import { adminGetAllCategories, Category } from "@/lib/api/category";

export default function AdminAuctionCreatePage() {
  const [productName, setProductName] = useState("");
  const [startPrice, setStartPrice] = useState<string>(""); // 문자열로 관리
  const [minBid, setMinBid] = useState<string>(""); // 문자열로 관리
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 카테고리 목록 로드
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await adminGetAllCategories();
        setCategories(response.data || []);
      } catch (error) {
        console.error("카테고리 목록 로드 실패:", error);
        setMessage("❌ 카테고리 목록을 불러올 수 없습니다.");
      }
    };
    loadCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const API_BASE_URL = getApiBaseUrl();
      
      console.log("📌 [API 요청 URL]:", `${API_BASE_URL}/admin/auctions`);

      const response = await fetch(`${API_BASE_URL}/admin/auctions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // 쿠키 기반 인증
        body: JSON.stringify({
          productName,
          startPrice: Number(startPrice),
          minBid: Number(minBid),
          startTime,
          endTime,
          imageUrl,
          description,
          categoryId: categoryId ? Number(categoryId) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "경매 등록 실패");
      }

      const data = await response.json();
      setMessage("✅ 경매가 성공적으로 등록되었습니다!");
      
      // 폼 초기화
      setProductName("");
      setStartPrice("");
      setMinBid("");
      setStartTime("");
      setEndTime("");
      setImageUrl("");
      setDescription("");
      setCategoryId("");
    } catch (error) {
      console.error("❌ 경매 등록 실패:", error);
      setMessage("❌ 경매 등록 실패: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">경매 상품 등록하기</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <label className="w-24">상품명:</label>
            <Input
              placeholder="상품명 입력"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24">시작 가격:</label>
            <Input
              type="number"
              placeholder="시작 가격 입력"
              value={startPrice}
              onChange={(e) => setStartPrice(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24">최소 입찰가:</label>
            <Input
              type="number"
              placeholder="최소 입찰가 입력"
              value={minBid}
              onChange={(e) => setMinBid(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24">시작 시간:</label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24">종료 시간:</label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24">이미지 URL:</label>
            <Input
              placeholder="이미지 URL 입력"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24">상품 설명:</label>
            <Input
              placeholder="상품 설명 입력"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24">카테고리:</label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="카테고리를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.categoryId} value={category.categoryId.toString()}>
                    {category.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "등록 중..." : "경매 등록하기"}
          </Button>
        </CardContent>
      </Card>

      {message && (
        <div className={`mt-4 p-3 rounded-md ${message.includes("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message}
        </div>
      )}
    </div>
  );
}
