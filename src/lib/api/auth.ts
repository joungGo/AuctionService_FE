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

const API_BASE_URL = getApiBaseUrl();

export async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const res = await response.json(); // 응답 데이터를 JSON으로 변환

  if (!response.ok) {
    throw new Error(res.msg);
  }

  return res.data;
}

export async function signupUser(
  email: string,
  password: string,
  nickname: string
) {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, nickname }),
  });

  const res = await response.json(); // 응답 데이터를 JSON으로 변환

  if (!response.ok) {
    throw new Error(res.msg);
  }

  return res.msg; // 성공 응답 반환 (userUUID 포함)
}

export const getAccessToken = () => {
  return localStorage.getItem("accessToken");
};

export const getUserInfo = () => {
  return {
    userUUID: localStorage.getItem("userUUID"),
    nickname: localStorage.getItem("nickname"),
  };
};

export const removeAuthData = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("userUUID");
  localStorage.removeItem("nickname");
};
