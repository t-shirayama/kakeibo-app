"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, PencilLine } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { BudgetEditModal } from "@/components/budget-edit-modal";
import { EmptyState, LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { categoriesQueryKeys } from "@/features/categories/queryKeys";
import { reportsQueryKeys } from "@/features/reports/queryKeys";
import { api, type CategoryRequest } from "@/lib/api";
import { buildAppRouteUrl } from "@/lib/app-route-url";
import { formatCurrency } from "@/lib/format";
import type { CategoryDto, DashboardSummaryDto } from "@/lib/types";

type BudgetTab = "settings" | "actuals";

export function BudgetManagementPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const activeTab = normalizeBudgetTab(searchParams.get("tab")) ?? "settings";
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);

  const selectedYearMonth = normalizeYearMonth(searchParams.get("month")) ?? getCurrentYearMonth();
  const selectedPeriod = useMemo(() => parseYearMonth(selectedYearMonth), [selectedYearMonth]);

  useEffect(() => {
    if (normalizeYearMonth(searchParams.get("month"))) {
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", selectedYearMonth);
    router.replace(buildAppRouteUrl(pathname, next));
  }, [pathname, router, searchParams, selectedYearMonth]);

  const categoriesQuery = useQuery({
    queryKey: categoriesQueryKeys.list(true),
    queryFn: () => api.list_categories({ include_inactive: true }),
  });
  const summaryQuery = useQuery({
    queryKey: reportsQueryKeys.dashboardSummary(selectedPeriod.year, selectedPeriod.month),
    queryFn: () => api.get_dashboard_summary({ year: selectedPeriod.year, month: selectedPeriod.month }) as Promise<DashboardSummaryDto>,
    placeholderData: keepPreviousData,
    enabled: activeTab === "actuals",
  });
  const updateBudgetMutation = useMutation({
    mutationFn: ({ category, monthlyBudget }: { category: CategoryDto; monthlyBudget: number | null }) =>
      api.update_category(category.category_id, buildCategoryUpdateRequest(category, monthlyBudget)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: reportsQueryKeys.all }),
      ]);
      setEditingCategory(null);
    },
  });

  const categories = useMemo(
    () => [...(categoriesQuery.data ?? [])].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name, "ja")),
    [categoriesQuery.data],
  );
  const configuredCategories = useMemo(
    () => categories.filter((category) => category.monthly_budget != null),
    [categories],
  );
  const totalConfiguredBudget = configuredCategories.reduce((sum, category) => sum + (category.monthly_budget ?? 0), 0);
  const budgetSummary = summaryQuery.data?.budget_summary;
  const budgetItems = useMemo(
    () =>
      [...(summaryQuery.data?.category_budget_summaries ?? [])].sort(
        (a, b) => b.budget_amount - a.budget_amount || b.actual_amount - a.actual_amount || a.name.localeCompare(b.name, "ja"),
      ),
    [summaryQuery.data?.category_budget_summaries],
  );
  const apiError = categoriesQuery.error || summaryQuery.error || updateBudgetMutation.error;

  function updateSelectedYearMonth(nextValue: string) {
    const normalized = normalizeYearMonth(nextValue);
    if (!normalized) {
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", normalized);
    router.replace(buildAppRouteUrl(pathname, next));
  }

  function updateActiveTab(nextTab: BudgetTab) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", nextTab);
    router.replace(buildAppRouteUrl(pathname, next));
  }

  return (
    <div className="budget-management-page">
      <PageHeader
        title="予算管理"
        subtitle="カテゴリごとの月次予算を設定し、対象月の予実をまとめて確認できます。"
      />

      {apiError ? <ApiErrorAlert error={apiError} /> : null}

      <section className="card panel section-gap">
        <div className="budget-tab-list" aria-label="予算管理ビュー切り替え">
          <button
            className={`budget-tab-button${activeTab === "settings" ? " active" : ""}`}
            type="button"
            aria-pressed={activeTab === "settings"}
            onClick={() => updateActiveTab("settings")}
          >
            予算設定
          </button>
          <button
            className={`budget-tab-button${activeTab === "actuals" ? " active" : ""}`}
            type="button"
            aria-pressed={activeTab === "actuals"}
            onClick={() => updateActiveTab("actuals")}
          >
            予実確認
          </button>
        </div>
      </section>

      {activeTab === "settings" ? (
        <section className="grid two-column-grid section-gap">
          <div className="card panel budget-settings-panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">カテゴリ別の予算設定</h2>
                <p className="panel-caption">カテゴリ名や色の変更はカテゴリ管理画面で行います。</p>
              </div>
            </div>
            {categoriesQuery.isLoading ? (
              <LoadingState />
            ) : categories.length === 0 ? (
              <EmptyState title="カテゴリがありません" description="カテゴリを追加すると、ここで月次予算を設定できます。" />
            ) : (
              <div className="budget-setting-list" aria-label="カテゴリ別の予算設定一覧">
                {categories.map((category) => (
                  <article className="budget-setting-row" key={category.category_id}>
                    <div className="budget-setting-title">
                      <span className="swatch" style={{ background: category.color }} />
                      <div>
                        <strong>{category.name}</strong>
                        <p>{category.description ?? "説明なし"}</p>
                      </div>
                    </div>
                    <div className="budget-setting-values">
                      <span className={`badge ${category.is_active ? "" : "inactive"}`}>{category.is_active ? "有効" : "無効"}</span>
                      <strong>{category.monthly_budget == null ? "未設定" : formatCurrency(category.monthly_budget)}</strong>
                    </div>
                    <div className="row-actions">
                      <button
                        className="button secondary compact"
                        type="button"
                        onClick={() => setEditingCategory(category)}
                        disabled={updateBudgetMutation.isPending}
                      >
                        <PencilLine size={14} aria-hidden="true" />
                        {category.monthly_budget == null ? "設定" : "変更"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="card panel">
            <h2 className="panel-title">設定状況</h2>
            <div className="budget-summary-grid">
              <article className="budget-stat-card">
                <span>設定済みカテゴリ</span>
                <strong>{configuredCategories.length}件</strong>
              </article>
              <article className="budget-stat-card">
                <span>月次予算合計</span>
                <strong>{formatCurrency(totalConfiguredBudget)}</strong>
              </article>
            </div>
            <p className="budget-empty-text">
              予算設定タブではカテゴリごとの月次予算だけを扱います。対象月の支出実績や超過状況は「予実確認」タブで確認します。
            </p>
          </div>
        </section>
      ) : (
        <section className="grid section-gap">
          <div className="card panel budget-actuals-panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">対象月の予実確認</h2>
                <p className="panel-caption">表示月の支出実績とカテゴリ別の予算進捗を確認できます。</p>
              </div>
              <div className="toolbar report-toolbar">
                <div className="month-switcher" aria-label="対象月の切り替え">
                  <button className="icon-button" type="button" aria-label="前月" onClick={() => updateSelectedYearMonth(addMonths(selectedYearMonth, -1))}>
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                  <label className="month-input-label">
                    <span className="sr-only">表示月</span>
                    <input
                      aria-label="表示月"
                      className="input month-input"
                      type="month"
                      value={selectedYearMonth}
                      onChange={(event) => updateSelectedYearMonth(event.target.value)}
                    />
                  </label>
                  <button className="icon-button" type="button" aria-label="翌月" onClick={() => updateSelectedYearMonth(addMonths(selectedYearMonth, 1))}>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            {summaryQuery.isLoading ? (
              <LoadingState />
            ) : !budgetSummary || budgetSummary.configured_category_count === 0 ? (
              <EmptyState title="月次予算が未設定です" description="予算設定タブでカテゴリごとの月次予算を登録すると、ここに予実を表示します。" />
            ) : (
              <div className="grid budget-actuals-content">
                <section className={`budget-overview-card ${budgetSummary.is_over_budget ? "is-over" : ""}`} aria-label="予算進捗">
                  <div className="budget-overview-header">
                    <div>
                      <strong>{formatYearMonthLabel(selectedYearMonth)}の予算進捗</strong>
                      <p>{describeBudgetStatus(budgetSummary)}</p>
                    </div>
                    <span className={`badge ${budgetSummary.is_over_budget ? "budget-over" : "inactive"}`}>
                      {formatProgressRatio(budgetSummary.progress_ratio)}
                    </span>
                  </div>
                  <dl className="budget-overview-metrics">
                    <div>
                      <dt>予算合計</dt>
                      <dd>{formatCurrency(budgetSummary.total_budget)}</dd>
                    </div>
                    <div>
                      <dt>支出実績</dt>
                      <dd>{formatCurrency(budgetSummary.actual_expense)}</dd>
                    </div>
                    <div>
                      <dt>{budgetSummary.remaining_amount >= 0 ? "残り" : "超過"}</dt>
                      <dd className={budgetSummary.remaining_amount < 0 ? "expense-worse" : "expense-improved"}>
                        {formatCurrency(Math.abs(budgetSummary.remaining_amount))}
                      </dd>
                    </div>
                  </dl>
                </section>

                <div className="card inset-panel budget-progress-panel">
                  <h3 className="panel-title">カテゴリ別の予実</h3>
                  <div className="budget-progress-list" aria-label="カテゴリ別予算進捗">
                    {budgetItems.map((item) => (
                      <article className="budget-progress-row" key={item.category_id}>
                        <div className="budget-progress-title">
                          <span className="swatch" style={{ background: item.color }} />
                          <strong>{item.name}</strong>
                        </div>
                        <div className="budget-progress-values">
                          <span>{formatCurrency(item.actual_amount)} / {formatCurrency(item.budget_amount)}</span>
                          <span className={item.is_over_budget ? "expense-worse" : "expense-improved"}>
                            {item.is_over_budget ? `超過 ${formatCurrency(Math.abs(item.remaining_amount))}` : `残り ${formatCurrency(item.remaining_amount)}`}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {editingCategory ? (
        <BudgetEditModal
          open
          categoryName={editingCategory.name}
          initialBudget={editingCategory.monthly_budget ?? null}
          error={updateBudgetMutation.error}
          isSubmitting={updateBudgetMutation.isPending}
          onOpenChange={(open) => {
            if (!open) {
              setEditingCategory(null);
            }
          }}
          onSubmit={async (monthlyBudget) => {
            await updateBudgetMutation.mutateAsync({ category: editingCategory, monthlyBudget });
          }}
        />
      ) : null}
    </div>
  );
}

function buildCategoryUpdateRequest(category: CategoryDto, monthlyBudget: number | null): CategoryRequest {
  return {
    name: category.name,
    color: category.color,
    description: category.description,
    monthly_budget: monthlyBudget,
  };
}

function getCurrentYearMonth() {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? String(new Date().getFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? String(new Date().getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function parseYearMonth(value: string) {
  const [year, month] = value.split("-").map(Number);

  return {
    year: Number.isInteger(year) ? year : Number(getCurrentYearMonth().slice(0, 4)),
    month: Number.isInteger(month) ? month : Number(getCurrentYearMonth().slice(5, 7)),
  };
}

function normalizeYearMonth(value: string | null) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }
  return value;
}

function normalizeBudgetTab(value: string | null): BudgetTab | null {
  if (value === "settings" || value === "actuals") {
    return value;
  }
  return null;
}

function addMonths(value: string, amount: number) {
  const { year, month } = parseYearMonth(value);
  const date = new Date(year, month - 1 + amount, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatYearMonthLabel(value: string) {
  const { year, month } = parseYearMonth(value);

  return `${year}年${month}月`;
}

function formatProgressRatio(value: number) {
  return `${Math.round(value * 100)}%`;
}

function describeBudgetStatus(summary: DashboardSummaryDto["budget_summary"]) {
  if (summary.is_over_budget) {
    return `予算は${formatCurrency(Math.abs(summary.remaining_amount))}超過しています`;
  }
  return `予算内です。残り${formatCurrency(summary.remaining_amount)}です`;
}
