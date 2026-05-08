"use client";

import { Edit3, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { MessageDialog, useMessageDialog } from "@/components/message-dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyState, LoadingState } from "@/components/state-block";
import { categoriesQueryKeys } from "@/features/categories/queryKeys";
import { categoryRulesQueryKeys } from "@/features/category-rules/queryKeys";
import { api, type CategoryRuleRequest } from "@/lib/api";
import type { CategoryDto, CategoryRuleDto } from "@/lib/types";

const initialForm = { keyword: "", categoryId: "" };

export default function CategoryRulesPage() {
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<CategoryRuleDto | null>(null);
  const [form, setForm] = useState(initialForm);
  const { messageDialog, showMessageDialog, handleMessageDialogOpenChange } = useMessageDialog();
  const rulesQuery = useQuery({
    queryKey: categoryRulesQueryKeys.list(true),
    queryFn: () => api.list_category_rules({ include_inactive: true }),
  });
  const categoriesQuery = useQuery({
    queryKey: categoriesQueryKeys.list(false),
    queryFn: () => api.list_categories(),
  });
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.category_id, category])), [categories]);
  const createMutation = useMutation({
    mutationFn: api.create_category_rule,
    onSuccess: handleMutationSuccess,
  });
  const updateMutation = useMutation({
    mutationFn: ({ ruleId, request }: { ruleId: string; request: CategoryRuleRequest }) =>
      api.update_category_rule(ruleId, request),
    onSuccess: handleMutationSuccess,
  });
  const statusMutation = useMutation({
    mutationFn: ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) =>
      api.set_category_rule_active(ruleId, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryRulesQueryKeys.all }),
  });
  const deleteMutation = useMutation({
    mutationFn: api.delete_category_rule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryRulesQueryKeys.all }),
  });
  const apiError =
    rulesQuery.error ||
    categoriesQuery.error ||
    createMutation.error ||
    updateMutation.error ||
    statusMutation.error ||
    deleteMutation.error;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  async function handleMutationSuccess() {
    await queryClient.invalidateQueries({ queryKey: categoryRulesQueryKeys.all });
    resetForm();
  }

  function startCreate() {
    setEditingRule(null);
    setForm({ ...initialForm, categoryId: categories[0]?.category_id ?? "" });
  }

  function startEdit(rule: CategoryRuleDto) {
    setEditingRule(rule);
    setForm({ keyword: rule.keyword, categoryId: rule.category_id });
  }

  function resetForm() {
    setEditingRule(null);
    setForm(initialForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = { keyword: form.keyword, category_id: form.categoryId || categories[0]?.category_id || "" };
    if (editingRule) {
      await updateMutation.mutateAsync({ ruleId: editingRule.rule_id, request });
      return;
    }
    await createMutation.mutateAsync(request);
  }

  async function handleDelete(rule: CategoryRuleDto) {
    const action = await showMessageDialog({
      title: "この分類ルールを削除しますか？",
      description: <p>店名キーワード「{rule.keyword}」の自動分類を削除します。</p>,
      tone: "danger",
      actions: [
        { id: "cancel", label: "キャンセル", variant: "secondary" },
        { id: "delete", label: "削除する", variant: "danger" },
      ],
    });
    if (action === "delete") {
      deleteMutation.mutate(rule.rule_id);
    }
  }

  return (
    <div className="categories-page">
      <PageHeader
        title="分類ルール"
        subtitle="PDF取込時に店名キーワードからカテゴリを自動設定します。"
        actions={
          <button className="button" type="button" onClick={startCreate} disabled={categories.length === 0}>
            <Plus size={15} aria-hidden="true" />
            ルールを追加
          </button>
        }
      />

      <section className="grid two-column-grid">
        <div className="card panel category-list-panel">
          <h2 className="panel-title">店名キーワード</h2>
          {apiError ? <ApiErrorAlert error={apiError} /> : null}
          {rulesQuery.isLoading || categoriesQuery.isLoading ? (
            <LoadingState />
          ) : (rulesQuery.data ?? []).length === 0 ? (
            <EmptyState title="分類ルールがありません" description="よく使う店名キーワードを登録して、PDF取込時の分類を自動化しましょう。" />
          ) : (
            <div className="category-list" aria-label="分類ルール一覧">
              {(rulesQuery.data ?? []).map((rule) => (
                <RuleRow
                  category={categoryById.get(rule.category_id)}
                  isPending={statusMutation.isPending || deleteMutation.isPending}
                  key={rule.rule_id}
                  rule={rule}
                  onDelete={() => void handleDelete(rule)}
                  onEdit={() => startEdit(rule)}
                  onToggle={() => statusMutation.mutate({ ruleId: rule.rule_id, isActive: !rule.is_active })}
                />
              ))}
            </div>
          )}
        </div>

        <div className="card panel">
          <h2 className="panel-title">{editingRule ? "分類ルールを編集" : "分類ルールを追加"}</h2>
          {categories.length === 0 ? (
            <EmptyState title="有効カテゴリがありません" description="先にカテゴリ管理で分類先カテゴリを追加してください。" />
          ) : (
            <form className="settings-list" onSubmit={(event) => void handleSubmit(event)}>
              <label className="settings-row form-row">
                <span>
                  <strong>店名キーワード</strong>
                  <span className="muted">店名に含まれる語句を登録します。</span>
                </span>
                <input
                  className="input"
                  aria-label="店名キーワード"
                  value={form.keyword}
                  onChange={(event) => setForm((current) => ({ ...current, keyword: event.target.value }))}
                  placeholder="Amazon"
                  maxLength={255}
                  required
                />
              </label>
              <label className="settings-row form-row">
                <span>
                  <strong>カテゴリ</strong>
                  <span className="muted">一致した明細へ設定するカテゴリです。</span>
                </span>
                <select
                  className="select"
                  aria-label="カテゴリ"
                  value={form.categoryId || categories[0]?.category_id || ""}
                  onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                  required
                >
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="modal-actions">
                {editingRule ? (
                  <button className="button secondary" type="button" onClick={resetForm}>
                    キャンセル
                  </button>
                ) : null}
                <button className="button" type="submit" disabled={isSubmitting}>
                  {editingRule ? "保存" : "追加"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {messageDialog ? (
        <MessageDialog
          open
          title={messageDialog.title}
          description={messageDialog.description}
          actions={messageDialog.actions}
          tone={messageDialog.tone}
          onAction={messageDialog.onAction}
          onOpenChange={handleMessageDialogOpenChange}
        />
      ) : null}
    </div>
  );
}

function RuleRow({
  category,
  isPending,
  rule,
  onDelete,
  onEdit,
  onToggle,
}: {
  category: CategoryDto | undefined;
  isPending: boolean;
  rule: CategoryRuleDto;
  onDelete: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="category-row">
      <span className="swatch" style={{ background: category?.color ?? "#6B7280" }} />
      <div>
        <strong>{rule.keyword}</strong>
        <div className="muted">{category ? `${category.name}へ分類` : "カテゴリが見つかりません"}</div>
      </div>
      <div className="row-actions">
        <span className={`badge ${rule.is_active ? "" : "inactive"}`}>{rule.is_active ? "有効" : "無効"}</span>
        <button className="icon-button" type="button" aria-label={`${rule.keyword}を編集`} onClick={onEdit}>
          <Edit3 size={15} aria-hidden="true" />
        </button>
        <button className="button secondary compact" type="button" onClick={onToggle} disabled={isPending}>
          {rule.is_active ? "無効化" : "有効化"}
        </button>
        <button className="icon-button" type="button" aria-label={`${rule.keyword}を削除`} onClick={onDelete} disabled={isPending}>
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
