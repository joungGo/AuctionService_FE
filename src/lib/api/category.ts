import { getApiBaseUrl } from '../config';

const API_BASE_URL = getApiBaseUrl();

export interface Category {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface CategoryRequest {
  categoryName: string;
  description?: string;
  imageUrl?: string;
}

export const getAllCategories = async (): Promise<{ data: Category[] }> => {
  const res = await fetch(`${API_BASE_URL}/categories`, {
    credentials: 'include',
  });
  return res.json();
};

export const getCategoryById = async (categoryId: number): Promise<{ data: Category }> => {
  const res = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
    credentials: 'include',
  });
  return res.json();
};

// 관리자 API 함수들
export const adminGetAllCategories = async (): Promise<{ data: Category[] }> => {
  const res = await fetch(`${API_BASE_URL}/admin/categories`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || '카테고리 목록 조회에 실패했습니다.');
  }
  const result = await res.json();
  return { data: result.data || [] };
};

export const adminGetCategoryById = async (categoryId: number): Promise<{ data: Category }> => {
  const res = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || '카테고리 조회에 실패했습니다.');
  }
  const result = await res.json();
  return { data: result.data };
};

export const adminCreateCategory = async (category: CategoryRequest): Promise<{ data: Category }> => {
  const res = await fetch(`${API_BASE_URL}/admin/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(category),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || '카테고리 생성에 실패했습니다.');
  }
  const result = await res.json();
  return { data: result.data };
};

export const adminUpdateCategory = async (categoryId: number, category: CategoryRequest): Promise<{ data: Category }> => {
  const res = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(category),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || '카테고리 수정에 실패했습니다.');
  }
  const result = await res.json();
  return { data: result.data };
};

export const adminDeleteCategory = async (categoryId: number): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || '카테고리 삭제에 실패했습니다.');
  }
}; 