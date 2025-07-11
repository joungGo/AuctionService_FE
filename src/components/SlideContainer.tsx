"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';

interface SlideContainerProps {
  children: React.ReactNode[];
  autoSlideInterval?: number;
  className?: string;
}

export default function SlideContainer({ 
  children, 
  autoSlideInterval = 3000,
  className = ""
}: SlideContainerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoSliding, setIsAutoSliding] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [itemsPerSlide, setItemsPerSlide] = useState(3); // 기본값 3

  // 클라이언트 사이드에서만 화면 크기 계산
  useEffect(() => {
    setIsClient(true);
    
    const calculateItemsPerSlide = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        if (width < 768) return 1;      // 모바일
        if (width < 1024) return 2;     // 태블릿
        return 3;                       // 데스크톱
      }
      return 3;
    };

    setItemsPerSlide(calculateItemsPerSlide());

    const handleResize = () => {
      const newItemsPerSlide = calculateItemsPerSlide();
      setItemsPerSlide(newItemsPerSlide);
      setCurrentIndex(0); // 화면 크기 변경 시 첫 슬라이드로 리셋
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 총 슬라이드 개수 계산
  const totalSlides = useMemo(() => {
    return Math.ceil(children.length / itemsPerSlide);
  }, [children.length, itemsPerSlide]);

  // 자동 슬라이드 (기존 로직 유지)
  useEffect(() => {
    if (!isAutoSliding || totalSlides <= 1 || !isClient) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % totalSlides);
    }, autoSlideInterval);

    return () => clearInterval(interval);
  }, [isAutoSliding, totalSlides, autoSlideInterval, isClient]);

  // 네비게이션 함수들 (기존 로직 유지)
  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % totalSlides);
    setIsAutoSliding(false);
    setTimeout(() => setIsAutoSliding(true), 10000);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + totalSlides) % totalSlides);
    setIsAutoSliding(false);
    setTimeout(() => setIsAutoSliding(true), 10000);
  }, [totalSlides]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsAutoSliding(false);
    setTimeout(() => setIsAutoSliding(true), 10000);
  }, []);

  // 서버 사이드 렌더링 중이거나 아이템이 적을 때 안정적인 그리드 레이아웃
  if (!isClient || children.length <= 1) {
    return (
      <div className={`w-full ${className}`}>
        <div className="px-12 lg:px-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // 슬라이드할 아이템들이 부족한 경우
  if (children.length <= itemsPerSlide) {
    return (
      <div className={`w-full ${className}`}>
        <div className="px-12 lg:px-16">
          <div className={`grid gap-6 ${
            itemsPerSlide === 1 ? 'grid-cols-1' : 
            itemsPerSlide === 2 ? 'grid-cols-2' : 
            'grid-cols-3'
          }`}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* 메인 슬라이드 영역 - 좌우 패딩 추가로 화살표 공간 확보 */}
      <div className="overflow-hidden px-12 lg:px-16">
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {Array.from({ length: totalSlides }, (_, slideIndex) => (
            <div key={slideIndex} className="w-full flex-shrink-0 px-2">
              <div className={`grid gap-6 lg:gap-8 ${
                itemsPerSlide === 1 ? 'grid-cols-1' : 
                itemsPerSlide === 2 ? 'grid-cols-2' : 
                'grid-cols-3'
              }`}>
                {children.slice(
                  slideIndex * itemsPerSlide,
                  slideIndex * itemsPerSlide + itemsPerSlide
                ).map((child, index) => (
                  <div key={index} className="w-full">
                    {child}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 네비게이션 - 패딩 영역 내부에 위치 */}
      {totalSlides > 1 && (
        <>
          {/* 좌측 화살표 */}
          <button
            onClick={prevSlide}
            className="absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-50 rounded-full p-3 lg:p-4 shadow-xl hover:shadow-2xl transition-all duration-300 group"
            aria-label="이전 슬라이드"
          >
            <svg className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600 group-hover:text-gray-900 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 우측 화살표 */}
          <button
            onClick={nextSlide}
            className="absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-50 rounded-full p-3 lg:p-4 shadow-xl hover:shadow-2xl transition-all duration-300 group"
            aria-label="다음 슬라이드"
          >
            <svg className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600 group-hover:text-gray-900 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* 인디케이터 - 더 큰 크기로 최적화 */}
      {totalSlides > 1 && (
        <div className="flex justify-center mt-8 lg:mt-10">
          <div className="flex space-x-3 lg:space-x-4">
            {Array.from({ length: totalSlides }, (_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex
                    ? 'bg-blue-500 w-10 h-3 lg:w-12 lg:h-4'
                    : 'bg-gray-300 hover:bg-gray-400 w-3 h-3 lg:w-4 lg:h-4'
                }`}
                aria-label={`슬라이드 ${index + 1}로 이동`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 