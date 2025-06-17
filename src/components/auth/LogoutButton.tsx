// src/components/auth/LogoutButton.tsx

"use client";

import { useRouter } from "next/navigation";
import { removeAuthData } from "@/lib/api/auth";

// 프로덕션 환경에서는 HTTPS를 사용하고, 개발 환경에서는 HTTP localhost를 사용
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // 클라이언트 사이드에서 실행
    if (window.location.protocol === 'https:') {
      // 프로덕션 환경 (HTTPS)
      return process.env.NEXT_PUBLIC_API_URL || 'https://auction-service-fe.vercel.app:8080/api';
    }
  }
  // 개발 환경 또는 서버 사이드
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
};

export const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        alert("로그인 정보가 없습니다.");
        return;
      }

      // 서버에 로그아웃 요청
      const res = await fetch(`${getApiBaseUrl()}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // ★ Authorization 헤더로 토큰 전송
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "로그아웃 요청 실패");
      }

      // 인증 정보 삭제
      removeAuthData(); // 내부에서 localStorage.removeItem("accessToken") 등 수행

      alert("로그아웃 되었습니다.");
      router.push("/");
    } catch (error) {
      console.error("로그아웃 실패", error);
      alert("로그아웃 실패: " + (error as Error).message);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
    >
      로그아웃
    </button>
  );
};
