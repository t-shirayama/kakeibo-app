"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { CategoryEditModal } from "@/components/category-edit-modal";
import { EmptyState, LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { api, type CategoryRequest } from "@/lib/api";
import type { CategoryDto } from "@/lib/types";

export default function CategoriesPage() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
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
  const uncategorizedCategory = useMemo(
    () => categories.find((category) => category.name === "未分類"),
    [categories],
  );
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
              <button className="button secondary" type="button" onClick={() => setIsRuleDialogOpen(true)}>
                編集
              </button>
            </div>
            <div className="settings-row">
              <div>
                <h2>未分類の扱い</h2>
                <p>自動分類できない取引は明細一覧で確認できます。</p>
              </div>
              {uncategorizedCategory ? (
                <Link
                  className="button secondary"
                  href={`/transactions?category_id=${uncategorizedCategory.category_id}&period=all`}
                  prefetch={false}
                >
                  確認
                </Link>
              ) : (
                <button className="button secondary" type="button" disabled>
                  確認
                </button>
              )}
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

      <Dialog.Root open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content" aria-describedby="category-rule-description">
            <div className="dialog-header">
              <Dialog.Title className="dialog-title">店名キーワードの分類ルール</Dialog.Title>
              <Dialog.Close className="icon-button" aria-label="分類ルールを閉じる">
                <X size={18} aria-hidden="true" />
              </Dialog.Close>
            </div>
            <Dialog.Description id="category-rule-description" className="sr-only">
              店名キーワードによる自動分類の現在の扱いを確認します。
            </Dialog.Description>
            <div className="settings-list">
              <div className="settings-row">
                <div>
                  <h2>現在の自動分類</h2>
                  <p>同じ店名、カード利用者、支払い方法の過去明細がある場合、その明細のカテゴリを候補として再利用します。</p>
                </div>
              </div>
              <div className="settings-row">
                <div>
                  <h2>編集方法</h2>
                  <p>店名ごとの分類を変える場合は、明細一覧で対象明細のカテゴリを編集してください。次回以降の同一店名分類に反映されます。</p>
                </div>
                <Link className="button secondary" href="/transactions?period=current_year" prefetch={false}>
                  明細一覧へ
                </Link>
              </div>
            </div>
            <div className="modal-actions">
              <Dialog.Close className="button" type="button">
                閉じる
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
