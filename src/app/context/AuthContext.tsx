"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { checkAuthStatus } from "@/lib/api/auth";

// 사용자 정보 타입 정의
interface User {
  userUUID: string;
  nickname: string;
  email: string;
}

// Context 안에 들어갈 데이터 타입 정의
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  refreshAuth: () => Promise<void>;
}

// Context 기본값 (초기화)
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  setUser: () => {},
  refreshAuth: async () => {},
});

// Provider 컴포넌트
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 인증 상태 새로고침 함수
  const refreshAuth = async () => {
    try {
      setIsLoading(true);
      const userData = await checkAuthStatus();
      setUser(userData);
    } catch (error) {
      console.error('인증 상태 확인 실패:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    refreshAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// 쉽게 가져다 쓸 수 있는 훅
export const useAuth = () => useContext(AuthContext);