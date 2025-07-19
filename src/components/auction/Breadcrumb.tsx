"use client";

import { useRouter } from "next/navigation";
import { Category } from "@/lib/api/category";

interface BreadcrumbProps {
  category?: Category;
  productName?: string;
  isBidPage?: boolean;
}

export default function Breadcrumb({ category, productName, isBidPage = false }: BreadcrumbProps) {
  const router = useRouter();

  const handleHomeClick = () => {
    router.push("/");
  };

  const handleCategoryClick = () => {
    if (category) {
      router.push(`/auctions?category=${category.categoryId}`);
    } else {
      router.push("/auctions");
    }
  };

  const handleAuctionsClick = () => {
    router.push("/auctions");
  };

  return (
    <div className="relative shrink-0 w-full">
      <div className="[flex-flow:wrap] bg-clip-padding border-0 border-[transparent] border-solid box-border content-start flex gap-2 items-start justify-start p-[16px] relative w-full">
        
        {/* 홈 */}
        <div className="relative shrink-0">
          <div className="css-ay0434 font-['Work_Sans:Medium',_'Noto_Sans_KR:Regular',_sans-serif] font-medium leading-[0] relative shrink-0 text-[#5c738a] text-[16px] text-left text-nowrap w-full">
            <p 
              className="block leading-[24px] whitespace-pre cursor-pointer hover:text-[#0f1417] transition-colors"
              onClick={handleHomeClick}
            >
              홈
            </p>
          </div>
        </div>

        {/* 구분자 */}
        <div className="relative shrink-0">
          <div className="css-ay0434 font-['Work_Sans:Medium',_sans-serif] font-medium leading-[0] relative shrink-0 text-[#5c738a] text-[16px] text-left text-nowrap w-full">
            <p className="block leading-[24px] whitespace-pre">/</p>
          </div>
        </div>

        {/* 경매 목록 또는 카테고리 */}
        <div className="relative shrink-0">
          <div className="css-ay0434 font-['Work_Sans:Medium',_'Noto_Sans_KR:Regular',_sans-serif] font-medium leading-[0] relative shrink-0 text-[#5c738a] text-[16px] text-left text-nowrap w-full">
            <p 
              className="block leading-[24px] whitespace-pre cursor-pointer hover:text-[#0f1417] transition-colors"
              onClick={category ? handleCategoryClick : handleAuctionsClick}
            >
              {category ? category.categoryName : "경매"}
            </p>
          </div>
        </div>

        {/* 구분자 */}
        <div className="relative shrink-0">
          <div className="css-ay0434 font-['Work_Sans:Medium',_sans-serif] font-medium leading-[0] relative shrink-0 text-[#5c738a] text-[16px] text-left text-nowrap w-full">
            <p className="block leading-[24px] whitespace-pre">/</p>
          </div>
        </div>

        {/* 상품명 */}
        <div className="relative shrink-0">
          <div className="css-1bkkkk font-['Work_Sans:Medium',_'Noto_Sans_KR:Regular',_sans-serif] font-medium leading-[0] relative shrink-0 text-[#0f1417] text-[16px] text-left text-nowrap w-full">
            <p className="block leading-[24px] whitespace-pre">
              {productName || "상품명"}
            </p>
          </div>
        </div>

        {/* 입찰 페이지인 경우 추가 구분자와 "입찰" 표시 */}
        {isBidPage && (
          <>
            <div className="relative shrink-0">
              <div className="css-ay0434 font-['Work_Sans:Medium',_sans-serif] font-medium leading-[0] relative shrink-0 text-[#5c738a] text-[16px] text-left text-nowrap w-full">
                <p className="block leading-[24px] whitespace-pre">/</p>
              </div>
            </div>
            <div className="relative shrink-0">
              <div className="css-1bkkkk font-['Work_Sans:Medium',_'Noto_Sans_KR:Regular',_sans-serif] font-medium leading-[0] relative shrink-0 text-[#0f1417] text-[16px] text-left text-nowrap w-full">
                <p className="block leading-[24px] whitespace-pre">입찰</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 