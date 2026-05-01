"use client";

import { Edit3, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { CategoryEditModal } from "@/components/category-edit-modal";
import { EmptyState, LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { api, type CategoryRequest } from "@/lib/api";
import type { CategoryDto } from "@/lib/types";

export default function CategoriesPage() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({
    queryKey: ["categories", "include-inactive"],
    queryFn: () => api.list_categories({ include_inactive: true }),
  });
  const createMutation = useMutation({
    mutationFn: api.create_category,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsEditorOpen(false);
      setEditingCategory(null);
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ categoryId, request }: { categoryId: string; request: CategoryRequest }) =>
      api.update_category(categoryId, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsEditorOpen(false);
      setEditingCategory(null);
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ categoryId, isActive }: { categoryId: string; isActive: boolean }) =>
      api.set_category_active(categoryId, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: api.delete_category,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
  const categories = categoriesQuery.data ?? [];
  const editorError = createMutation.error || updateMutation.error;
  const apiError = categoriesQuery.error || editorError || statusMutation.error || deleteMutation.error;

  return (
    <>
      <PageHeader
        title="カテゴリ管理"
        subtitle="自動分類に使うカテゴリ、色、予算を管理します。"
        actions={
          <button
            className="button"
            type="button"
            onClick={() => {
              setEditingCategory(null);
              setIsEditorOpen(true);
            }}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Plus size={15} aria-hidden="true" />
            カテゴリを追加
          </button>
        }
      />

      <section className="grid two-column-grid">
        <div className="card panel">
          <h2 className="panel-title">支出カテゴリ</h2>
          {apiError ? <ApiErrorAlert error={apiError} /> : null}
          {categoriesQuery.isLoading ? (
            <LoadingState />
          ) : categories.length === 0 ? (
            <EmptyState title="カテゴリがありません" description="最初のカテゴリを追加して明細を分類しましょう。" />
          ) : (
            <div className="category-list">
              {categories.map((category) => (
                <div className="category-row" key={category.category_id}>
                  <span className="swatch" style={{ background: category.color }} />
                  <div>
                    <strong>{category.name}</strong>
                    <div className="muted">{category.description ?? "説明なし"}</div>
                  </div>
                  <div className="row-actions">
                    <span className={`badge ${category.is_active ? "" : "inactive"}`}>
                      {category.is_active ? "有効" : "無効"}
                    </span>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`${category.name}を編集`}
                      onClick={() => {
                        setEditingCategory(category);
                        setIsEditorOpen(true);
                      }}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      <Edit3 size={15} aria-hidden="true" />
                    </button>
                    <button
                      className="button secondary compact"
                      type="button"
                      onClick={() =>
                        statusMutation.mutate({
                          categoryId: category.category_id,
                          isActive: !category.is_active,
                        })
                      }
                      disabled={statusMutation.isPending}
                    >
                      {category.is_active ? "無効化" : "有効化"}
                    </button>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`${category.name}を削除`}
                      onClick={() => {
                        if (window.confirm("このカテゴリを削除しますか？")) {
                          deleteMutation.mutate(category.category_id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card panel">
          <h2 className="panel-title">分類ルール</h2>
          <div className="settings-list">
            <div className="settings-row">
              <div>
                <h2>店名キーワード</h2>
                <p>PDF明細の店名に一致する語句でカテゴリ候補を作成します。</p>
              </div>
              <button className="button secondary" type="button">
                編集
              </button>
            </div>
            <div className="settings-row">
              <div>
                <h2>未分類の扱い</h2>
                <p>自動分類できない取引は明細一覧で確認できます。</p>
              </div>
              <button className="button secondary" type="button">
                確認
              </button>
            </div>
          </div>
        </div>
      </section>

      <CategoryEditModal
        open={isEditorOpen}
        category={editingCategory}
        error={editorError}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onOpenChange={(open) => {
          setIsEditorOpen(open);
          if (!open) {
            setEditingCategory(null);
          }
        }}
        onSubmit={async (request) => {
          if (editingCategory) {
            await updateMutation.mutateAsync({ categoryId: editingCategory.category_id, request });
            return;
          }
          await createMutation.mutateAsync(request);
        }}
      />
    </>
  );
}
