import React, { useRef, useEffect, useState } from "react";
import "./InfiniteScrollCarousel.css";

interface InfiniteScrollCarouselProps {
  children: React.ReactNode[];
  speed?: number; // px/sec, 기본 60
}

export default function InfiniteScrollCarousel({
  children,
  speed = 2000, // px/sec
}: InfiniteScrollCarouselProps) {
  // 카드 세트 2번 반복
  const items = [...children, ...children];
  const trackRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [offset, setOffset] = useState(0); // 현재 X 위치(px)
  const cardWidth = 340 + 32; // 카드+마진(px)
  const totalCards = children.length;
  const oneSetWidth = totalCards * cardWidth;

  // 연속 이동 애니메이션
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();
    function animate(now: number) {
      if (isPaused) {
        lastTime = now;
        animationId = requestAnimationFrame(animate);
        return;
      }
      const dt = now - lastTime;
      lastTime = now;
      setOffset((prev) => {
        let next = prev + (speed * dt) / 1000;
        if (next >= oneSetWidth) {
          // 한 세트만큼 이동하면 0으로 순간 이동
          return next - oneSetWidth;
        }
        return next;
      });
      animationId = requestAnimationFrame(animate);
    }
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, speed, oneSetWidth]);

  // hover 시 일시정지
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  return (
    <div
      className="relative overflow-hidden w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="infinite-carousel-gradient-mask left" />
      <div className="infinite-carousel-gradient-mask right" />
      <div
        className="infinite-carousel-track flex items-stretch"
        ref={trackRef}
        style={{
          transform: `translateX(-${offset}px)`,
          transition: "none",
        }}
      >
        {items.map((child, idx) => (
          <div className="infinite-carousel-card h-full flex flex-col justify-between" key={idx}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
} 