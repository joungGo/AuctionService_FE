"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { loginUser } from "@/lib/api/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const { refreshAuth } = useAuth();
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    try {
      // 로그인 API 호출 (쿠키는 서버에서 자동으로 설정됨)
      const result = await loginUser(email, password);

      // 로그인 성공 후 인증 상태 새로고침
      await refreshAuth();
      
      // 로그인 상태 변경 이벤트 발생
      window.dispatchEvent(new Event('login-status-change'));
      
      alert("로그인 성공!");
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return <LoginForm onSubmit={handleLogin} error={error} />;
}
