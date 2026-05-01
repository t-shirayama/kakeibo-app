"use client";

import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { EmptyState, LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: api.list_categories });
  const createMutation = useMutation({
    mutationFn: api.create_category,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
  const categories = categoriesQuery.data ?? [];

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
              const name = window.prompt("カテゴリ名");
              if (!name) {
                return;
              }
              createMutation.mutate({ name, color: "#2f7df6", description: null });
            }}
            disabled={createMutation.isPending}
          >
            <Plus size={15} aria-hidden="true" />
            カテゴリを追加
          </button>
        }
      />

      <section className="grid two-column-grid">
        <div className="card panel">
          <h2 className="panel-title">支出カテゴリ</h2>
          {categoriesQuery.error || createMutation.error ? <ApiErrorAlert error={categoriesQuery.error || createMutation.error} /> : null}
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
                  <span className="amount">{category.is_active ? "有効" : "無効"}</span>
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
    </>
  );
}
