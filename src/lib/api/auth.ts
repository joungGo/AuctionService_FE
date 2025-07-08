import { getApiBaseUrl } from '../config';

const API_BASE_URL = getApiBaseUrl();

export async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  const res = await response.json();

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
    credentials: 'include',
    body: JSON.stringify({ email, password, nickname }),
  });

  const res = await response.json();

  if (!response.ok) {
    throw new Error(res.msg);
  }

  return res.msg;
}

export async function logoutUser() {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
  });

  const res = await response.json();

  if (!response.ok) {
    throw new Error(res.msg || "로그아웃 요청 실패");
  }

  return res.msg;
}

export async function checkAuthStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/check`, {
      method: "GET",
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const res = await response.json();
    return res.data;
  } catch (error) {
    console.error('인증 상태 확인 실패:', error);
    return null;
  }
}

export const removeAuthData = () => {
  localStorage.removeItem("userUUID");
  localStorage.removeItem("nickname");
};
