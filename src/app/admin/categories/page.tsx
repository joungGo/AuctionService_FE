"use client";

import { useState, useEffect } from "react";
import { 
  adminGetAllCategories, 
  adminCreateCategory, 
  adminUpdateCategory, 
  adminDeleteCategory,
  Category, 
  CategoryRequest 
} from "@/lib/api/category";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryRequest>({
    categoryName: ""
  });

  // 카테고리 목록 조회
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await adminGetAllCategories();
      console.log("카테고리 응답:", response);
      setCategories(response.data || []);
    } catch (err: any) {
      console.error("카테고리 조회 실패:", err);
      setError("카테고리를 불러오는데 실패했습니다.");
      setCategories([]); // 빈 배열로 초기화
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 카테고리 생성
  const handleCreate = async () => {
    try {
      await adminCreateCategory(formData);
      setShowCreateDialog(false);
      setFormData({ categoryName: "" });
      fetchCategories();
    } catch (err: any) {
      console.error("카테고리 생성 실패:", err);
      console.error("오류 상세:", err.message);
      alert(`카테고리 생성에 실패했습니다: ${err.message}`);
    }
  };

  // 카테고리 수정
  const handleUpdate = async () => {
    if (!selectedCategory) return;
    try {
      await adminUpdateCategory(selectedCategory.categoryId, formData);
      setShowEditDialog(false);
      setSelectedCategory(null);
      setFormData({ categoryName: "" });
      fetchCategories();
    } catch (err: any) {
      console.error("카테고리 수정 실패:", err);
      alert("카테고리 수정에 실패했습니다.");
    }
  };

  // 카테고리 삭제
  const handleDelete = async () => {
    if (!selectedCategory) return;
    try {
      await adminDeleteCategory(selectedCategory.categoryId);
      setShowDeleteDialog(false);
      setSelectedCategory(null);
      fetchCategories();
    } catch (err: any) {
      console.error("카테고리 삭제 실패:", err);
      alert("카테고리 삭제에 실패했습니다.");
    }
  };

  // 수정 다이얼로그 열기
  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      categoryName: category.categoryName
    });
    setShowEditDialog(true);
  };

  // 삭제 다이얼로그 열기
  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteDialog(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">카테고리 관리</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          새 카테고리 추가
        </Button>
      </div>

      {/* 카테고리 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories && categories.length > 0 ? (
          categories.map((category) => (
          <div key={category.categoryId} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">{category.categoryName}</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openEditDialog(category)}
                >
                  수정
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => openDeleteDialog(category)}
                >
                  삭제
                </Button>
              </div>
            </div>

          </div>
        ))
        ) : (
          <div className="col-span-full flex justify-center items-center h-32 bg-white rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <span className="text-gray-400 text-2xl">📂</span>
              <p className="text-gray-500">등록된 카테고리가 없습니다.</p>
            </div>
          </div>
        )}
      </div>

      {/* 카테고리 생성 다이얼로그 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 카테고리 추가</DialogTitle>
            <DialogDescription>
              새로운 카테고리를 생성합니다. 카테고리명은 필수 입력 항목입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">카테고리명</label>
              <Input
                value={formData.categoryName}
                onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                placeholder="카테고리명을 입력하세요"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              취소
            </Button>
            <Button onClick={handleCreate}>생성</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 카테고리 수정 다이얼로그 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>카테고리 수정</DialogTitle>
            <DialogDescription>
              카테고리 정보를 수정합니다. 카테고리명은 필수 입력 항목입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">카테고리명</label>
              <Input
                value={formData.categoryName}
                onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                placeholder="카테고리명을 입력하세요"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              취소
            </Button>
            <Button onClick={handleUpdate}>수정</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 카테고리 삭제 확인 다이얼로그 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>카테고리 삭제</DialogTitle>
            <DialogDescription>
              "{selectedCategory?.categoryName}" 카테고리를 삭제하시겠습니까?
              <br />
              <span className="text-red-500 text-sm">
                이 카테고리에 속한 상품이 있다면 삭제할 수 없습니다.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 