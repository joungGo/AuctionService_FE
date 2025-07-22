"use client";

import { useState, useEffect } from "react";
import { getAllCategories, Category } from "@/lib/api/category";

interface CategoryFilterProps {
  selectedCategoryId: number | null;
  onCategoryChange: (categoryId: number | null) => void;
}

// 카테고리별 아이콘 매핑
export const getCategoryIcon = (categoryName: string) => {
  switch (categoryName) {
    case '수집품':
      return '🏛️';
    case '전자제품':
      return '📱';
    case '의류':
      return '👕';
    case '도서':
      return '📚';
    case '스포츠':
      return '⚽';
    case '예술품':
      return '🎨';
    case '자동차':
      return '🚗';
    case '부동산':
      return '🏠';
    default:
      return '📦';
  }
};

// 카테고리별 색상 매핑
const getCategoryColor = (categoryName: string) => {
  switch (categoryName) {
    case '수집품':
      return 'bg-purple-500 hover:bg-purple-600';
    case '전자제품':
      return 'bg-blue-500 hover:bg-blue-600';
    case '의류':
      return 'bg-pink-500 hover:bg-pink-600';
    case '도서':
      return 'bg-green-500 hover:bg-green-600';
    case '스포츠':
      return 'bg-orange-500 hover:bg-orange-600';
    case '예술품':
      return 'bg-red-500 hover:bg-red-600';
    case '자동차':
      return 'bg-gray-500 hover:bg-gray-600';
    case '부동산':
      return 'bg-indigo-500 hover:bg-indigo-600';
    default:
      return 'bg-blue-500 hover:bg-blue-600';
  }
};

export default function CategoryFilter({ selectedCategoryId, onCategoryChange }: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await getAllCategories();
        setCategories(response.data);
      } catch (err: any) {
        console.error("카테고리 조회 실패:", err);
        setError("카테고리를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-16">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <p className="text-gray-600 ml-2">카테고리 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-16">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full mb-8">
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <div className="w-full sm:w-auto flex flex-wrap gap-2 sm:gap-3">
        {/* 전체 카테고리 버튼 */}
        <button
          onClick={() => onCategoryChange(null)}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
            selectedCategoryId === null
              ? "bg-blue-500 text-white shadow-lg transform scale-105"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md"
          }`}
        >
          <span>🏠</span>
          <span>전체</span>
        </button>
        
        {/* 카테고리별 버튼들 */}
        {categories.map((category) => (
          <button
            key={category.categoryId}
            onClick={() => onCategoryChange(category.categoryId)}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
              selectedCategoryId === category.categoryId
                ? `${getCategoryColor(category.categoryName)} text-white shadow-lg transform scale-105`
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md"
            }`}
          >
            <span>{getCategoryIcon(category.categoryName)}</span>
            <span className="hidden sm:inline">{category.categoryName}</span>
            <span className="sm:hidden">{category.categoryName.length > 2 ? category.categoryName.substring(0, 2) : category.categoryName}</span>
          </button>
        ))}
        </div>
      </div>
    </div>
  );
} 