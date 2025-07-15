// src/components/auth/LogoutButton.tsx

"use client";

import { useRouter } from "next/navigation";
import { logoutUser, removeAuthData } from "@/lib/api/auth";
import { useAuth } from "@/app/context/AuthContext";
import { useWebSocket } from "@/app/context/WebSocketContext";

export const LogoutButton = () => {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const { disconnect } = useWebSocket();

  const handleLogout = async () => {
    try {
      // 서버에 로그아웃 요청 (쿠키 기반 인증)
      await logoutUser();

      // 클라이언트 사이드 인증 정보 정리
      removeAuthData();

      // 웹소켓 연결 해제
      disconnect();

      // 인증 상태 새로고침
      await refreshAuth();

      // 로그인 상태 변경 이벤트 발생
      window.dispatchEvent(new Event('login-status-change'));

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
