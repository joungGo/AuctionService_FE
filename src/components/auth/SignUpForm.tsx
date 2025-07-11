// src/components/auth/SignUpForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { signupUser } from "@/lib/api/auth";
import { getApiBaseUrl } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const SignUpForm = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [timer, setTimer] = useState(180);
  const [isBlocked, setIsBlocked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let countdown: ReturnType<typeof setInterval> | null = null;
    if (showVerificationInput && timer > 0 && !isVerified) {
      countdown = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0 && !isVerified) {
      setIsBlocked(true);
      if (countdown) clearInterval(countdown);
    } else if (isVerified) {
      if (countdown) clearInterval(countdown);
    }
    return () => {
      if (countdown) clearInterval(countdown);
    };
  }, [showVerificationInput, timer, isVerified]);

  const handleEmailVerification = async () => {
    try {
      const response = await axios.post(
        `${getApiBaseUrl()}/auth/send-code`,
        { email }
      );
      if (response.data.code === "200") {
        setShowVerificationInput(true);
        setTimer(180);
        setIsBlocked(false);
        alert(response.data.msg);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.msg || "이메일 전송에 실패했습니다.");
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
    }
  };

  const handleCodeVerification = async () => {
    try {
      const response = await axios.post(
        `${getApiBaseUrl()}/auth/vertify`,
        { email, code: inputCode }
      );
      if (response.data.code === "200") {
        setIsVerified(true);
        alert(response.data.msg);
      } else {
        setError(response.data.msg);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.msg || "인증 확인에 실패했습니다.");
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isVerified) {
      setError("이메일 인증을 완료해주세요.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      // 기존 API는 nickname을 사용하므로 name을 nickname으로 전달
      const message = await signupUser(email, password, name || "사용자");
      alert(`${message}`);
      router.push("/auth/login");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-2 pb-32">
      <div className="max-w-md w-full space-y-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">계정 만들기</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email with Verification Button */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              이메일 주소
            </label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소 입력"
                className="w-full h-14 px-4 pr-20 border border-gray-300 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <button
                type="button"
                onClick={handleEmailVerification}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-gray-200 text-gray-800 text-sm font-bold rounded-full hover:bg-gray-300 transition-colors"
              >
                인증
              </button>
            </div>
          </div>

          {/* Email Verification Code */}
          {showVerificationInput && (
            <div className="space-y-2">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                이메일 인증 코드
              </label>
              <Input
                id="code"
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="인증 코드 입력"
                disabled={isBlocked || isVerified}
                className={`w-full h-14 px-4 border border-gray-300 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isBlocked || isVerified ? "bg-gray-200 cursor-not-allowed" : ""
                }`}
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {`남은 시간: ${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, "0")}`}
                </p>
                <button
                  type="button"
                  onClick={handleCodeVerification}
                  disabled={isBlocked || isVerified}
                  className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-full hover:bg-blue-600 transition-colors disabled:bg-gray-400"
                >
                  {isVerified ? "완료" : "확인"}
                </button>
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              비밀번호
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full h-14 px-4 border border-gray-300 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              비밀번호 확인
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호 확인"
              className="w-full h-14 px-4 border border-gray-300 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Name (Optional) */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              닉네임
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="닉네임 입력"
              className="w-full h-14 px-4 border border-gray-300 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-10 bg-blue-200 hover:bg-blue-300 text-gray-800 font-bold rounded-full transition-colors"
          >
            가입하기
          </Button>

          {/* Terms */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              가입하면 서비스 약관 및 개인정보 처리방침에 동의하는 것으로 간주합니다.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
