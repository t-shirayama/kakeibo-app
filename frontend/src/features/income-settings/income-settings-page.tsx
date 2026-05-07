"use client";

import { CalendarPlus, Plus, Save, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useMemo, useState } from "react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { MessageDialog, type MessageDialogAction } from "@/components/message-dialog";
import { EmptyState, LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { categoriesQueryKeys } from "@/features/categories/queryKeys";
import { incomeSettingsQueryKeys } from "@/features/income-settings/queryKeys";
import { api, type IncomeOverrideRequest, type IncomeSettingRequest } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { CategoryDto, IncomeSettingDto } from "@/lib/types";

type OverrideDraft = {
  targetMonth: string;
  amount: string;
  day: string;
};

type MessageDialogState = {
  title: string;
  description: ReactNode;
  actions: MessageDialogAction[];
  tone?: "info" | "danger";
  onAction: (actionId: string) => void;
};

export default function IncomeSettingsPage() {
  const queryClient = useQueryClient();
  const currentMonth = getCurrentYearMonth();
  const [newMemberName, setNewMemberName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDay, setNewDay] = useState("25");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newStartMonth, setNewStartMonth] = useState(currentMonth);
  const [newEndMonth, setNewEndMonth] = useState("");
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, OverrideDraft>>({});
  const [messageDialog, setMessageDialog] = useState<MessageDialogState | null>(null);

  const incomeSettingsQuery = useQuery({ queryKey: incomeSettingsQueryKeys.all, queryFn: api.list_income_settings });
  const categoriesQuery = useQuery({ queryKey: categoriesQueryKeys.list(), queryFn: () => api.list_categories() });
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const incomeSettings = useMemo(() => incomeSettingsQuery.data ?? [], [incomeSettingsQuery.data]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.category_id, category])), [categories]);
  const defaultCategoryId = newCategoryId || categories.find((category) => category.name.includes("給与"))?.category_id || categories[0]?.category_id || "";

  const createMutation = useMutation({
    mutationFn: api.create_income_setting,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: incomeSettingsQueryKeys.all }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ incomeSettingId, request }: { incomeSettingId: string; request: IncomeSettingRequest }) =>
      api.update_income_setting(incomeSettingId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: incomeSettingsQueryKeys.all }),
  });
  const deleteMutation = useMutation({
    mutationFn: api.delete_income_setting,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: incomeSettingsQueryKeys.all }),
  });
  const overrideMutation = useMutation({
    mutationFn: ({
      incomeSettingId,
      targetMonth,
      request,
    }: {
      incomeSettingId: string;
      targetMonth: string;
      request: IncomeOverrideRequest;
    }) => api.upsert_income_override(incomeSettingId, targetMonth, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: incomeSettingsQueryKeys.all }),
  });
  const deleteOverrideMutation = useMutation({
    mutationFn: ({ incomeSettingId, targetMonth }: { incomeSettingId: string; targetMonth: string }) =>
      api.delete_income_override(incomeSettingId, targetMonth),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: incomeSettingsQueryKeys.all }),
  });

  const apiError =
    incomeSettingsQuery.error ||
    categoriesQuery.error ||
    createMutation.error ||
    updateMutation.error ||
    deleteMutation.error ||
    overrideMutation.error ||
    deleteOverrideMutation.error;
  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    overrideMutation.isPending ||
    deleteOverrideMutation.isPending;

  function showMessageDialog(options: Omit<MessageDialogState, "onAction">): Promise<string> {
    return new Promise((resolve) => {
      setMessageDialog({
        ...options,
        onAction: (actionId) => {
          setMessageDialog(null);
          resolve(actionId);
        },
      });
    });
  }

  async function handleDeleteIncomeSetting(setting: IncomeSettingDto) {
    const action = await showMessageDialog({
      title: "この収入設定を削除しますか？",
      description: <p>対象「{setting.member_name}」の収入設定と月別変更が削除されます。</p>,
      tone: "danger",
      actions: [
        { id: "cancel", label: "キャンセル", variant: "secondary" },
        { id: "delete", label: "削除する", variant: "danger" },
      ],
    });
    if (action === "delete") {
      deleteMutation.mutate(setting.income_setting_id);
    }
  }

  function createIncomeSetting() {
    if (!defaultCategoryId) {
      return;
    }
    createMutation.mutate({
      member_name: newMemberName,
      category_id: defaultCategoryId,
      base_amount: Number(newAmount),
      base_day: Number(newDay),
      start_month: newStartMonth,
      end_month: newEndMonth || null,
    });
  }

  function updateIncomeSetting(setting: IncomeSettingDto, formData: FormData) {
    updateMutation.mutate({
      incomeSettingId: setting.income_setting_id,
      request: {
        member_name: String(formData.get("member_name") ?? ""),
        category_id: String(formData.get("category_id") ?? ""),
        base_amount: Number(formData.get("base_amount") ?? 0),
        base_day: Number(formData.get("base_day") ?? 1),
        start_month: String(formData.get("start_month") ?? currentMonth),
        end_month: normalizeOptionalMonth(formData.get("end_month")),
      },
    });
  }

  function upsertOverride(setting: IncomeSettingDto) {
    const draft = overrideDrafts[setting.income_setting_id] ?? defaultOverrideDraft(setting);
    if (!draft.targetMonth) {
      return;
    }
    overrideMutation.mutate({
      incomeSettingId: setting.income_setting_id,
      targetMonth: draft.targetMonth,
      request: { amount: Number(draft.amount), day: Number(draft.day) },
    });
  }

  function updateOverrideDraft(target: IncomeSettingDto, patch: Partial<OverrideDraft>) {
    setOverrideDrafts((current) => ({
      ...current,
      [target.income_setting_id]: {
        ...defaultOverrideDraft(target),
        ...current[target.income_setting_id],
        ...patch,
      },
    }));
  }

  return (
    <>
      <PageHeader title="収入設定" subtitle="家族ごとの毎月収入を登録し、指定期間の発生日に合わせて明細へ自動追加します。" />

      {apiError ? <ApiErrorAlert error={apiError} /> : null}

      <section className="grid two-column-grid">
        <div className="card panel">
          <h2 className="panel-title">新しい収入</h2>
          <div className="settings-list">
            <div className="form-field">
              <label htmlFor="new-member-name">対象</label>
              <input
                id="new-member-name"
                className="input wide"
                value={newMemberName}
                onChange={(event) => setNewMemberName(event.target.value)}
                placeholder="夫、妻、本人など"
              />
            </div>
            <div className="income-form-grid">
              <div className="form-field">
                <label htmlFor="new-income-amount">毎月の金額</label>
                <input
                  id="new-income-amount"
                  className="input numeric-input-plain"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={newAmount}
                  onChange={(event) => setNewAmount(event.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="new-income-day">発生日</label>
                <input
                  id="new-income-day"
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="31"
                  value={newDay}
                  onChange={(event) => setNewDay(event.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="new-income-start-month">登録開始月</label>
                <input
                  id="new-income-start-month"
                  className="input"
                  type="month"
                  value={newStartMonth}
                  onChange={(event) => setNewStartMonth(event.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="new-income-end-month">登録終了月</label>
                <input
                  id="new-income-end-month"
                  className="input"
                  type="month"
                  value={newEndMonth}
                  onChange={(event) => setNewEndMonth(event.target.value)}
                />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="new-income-category">カテゴリ</label>
              <select
                id="new-income-category"
                className="select"
                value={defaultCategoryId}
                onChange={(event) => setNewCategoryId(event.target.value)}
                disabled={categories.length === 0}
              >
                {categories.map((category) => (
                  <option value={category.category_id} key={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="button"
              type="button"
              onClick={createIncomeSetting}
              disabled={!newMemberName.trim() || !newAmount || !defaultCategoryId || createMutation.isPending}
            >
              <Plus size={15} aria-hidden="true" />
              {createMutation.isPending ? "追加中" : "追加"}
            </button>
          </div>
        </div>

        <div className="card panel">
          <h2 className="panel-title">自動追加の扱い</h2>
          <div className="settings-list">
            <div className="settings-row">
              <div>
                <h2>毎月の明細</h2>
                <p>登録開始月から登録終了月までの範囲で、発生日を迎えた月の収入明細を重複しないよう自動で追加します。</p>
              </div>
            </div>
            <div className="settings-row">
              <div>
                <h2>期間指定と過去月の登録</h2>
                <p>登録開始月を過去の月にすると、指定期間内で発生日を過ぎている月の収入もまとめて自動登録します。登録終了月を空欄にすると継続扱いです。</p>
              </div>
            </div>
            <div className="settings-row">
              <div>
                <h2>月別変更</h2>
                <p>賞与や一時的な変更がある月は、対象月だけ金額と発生日を上書きできます。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card panel section-gap">
        <h2 className="panel-title">登録済み収入</h2>
        {incomeSettingsQuery.isLoading || categoriesQuery.isLoading ? (
          <LoadingState />
        ) : incomeSettings.length === 0 ? (
          <EmptyState title="収入設定がありません" description="家族ごとの毎月収入を追加してください。" />
        ) : (
          <div className="income-setting-list">
            {incomeSettings.map((setting) => {
              const category = categoryById.get(setting.category_id);
              const draft = overrideDrafts[setting.income_setting_id] ?? defaultOverrideDraft(setting);
              return (
                <div className="income-setting-row" key={setting.income_setting_id}>
                  <form
                    className="income-setting-main"
                    onSubmit={(event) => {
                      event.preventDefault();
                      updateIncomeSetting(setting, new FormData(event.currentTarget));
                    }}
                  >
                    <input className="input" name="member_name" aria-label="対象" defaultValue={setting.member_name} />
                    <input
                      className="input numeric-input-plain"
                      name="base_amount"
                      aria-label={`${setting.member_name}の毎月の金額`}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      defaultValue={setting.base_amount}
                    />
                    <input
                      className="input"
                      name="base_day"
                      aria-label={`${setting.member_name}の発生日`}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="31"
                      defaultValue={setting.base_day}
                    />
                    <input
                      className="input"
                      name="start_month"
                      aria-label={`${setting.member_name}の登録開始月`}
                      type="month"
                      defaultValue={setting.start_month}
                    />
                    <input
                      className="input"
                      name="end_month"
                      aria-label={`${setting.member_name}の登録終了月`}
                      type="month"
                      defaultValue={setting.end_month ?? ""}
                    />
                    <select className="select" name="category_id" aria-label={`${setting.member_name}のカテゴリ`} defaultValue={setting.category_id}>
                      {categories.map((item) => (
                        <option value={item.category_id} key={item.category_id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <button className="icon-button" type="submit" aria-label={`${setting.member_name}を保存`} disabled={isBusy}>
                      <Save size={15} aria-hidden="true" />
                    </button>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`${setting.member_name}を削除`}
                      onClick={() => void handleDeleteIncomeSetting(setting)}
                      disabled={isBusy}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </form>
                  <div className="income-setting-summary">
                    <span>{formatCurrency(setting.base_amount)}</span>
                    <span>毎月{setting.base_day}日</span>
                    <span>{formatIncomeSettingPeriod(setting.start_month, setting.end_month)}</span>
                    <IncomeCategoryBadge category={category} />
                  </div>
                  <div className="income-override-row">
                    <CalendarPlus size={16} aria-hidden="true" />
                    <input
                      className="input"
                      type="month"
                      aria-label={`${setting.member_name}の変更月`}
                      value={draft.targetMonth}
                      onChange={(event) => updateOverrideDraft(setting, { targetMonth: event.target.value })}
                    />
                    <input
                      className="input numeric-input-plain"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      aria-label={`${setting.member_name}の月別金額`}
                      value={draft.amount}
                      onChange={(event) => updateOverrideDraft(setting, { amount: event.target.value })}
                    />
                    <input
                      className="input"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="31"
                      aria-label={`${setting.member_name}の月別発生日`}
                      value={draft.day}
                      onChange={(event) => updateOverrideDraft(setting, { day: event.target.value })}
                    />
                    <button className="button secondary compact" type="button" onClick={() => upsertOverride(setting)} disabled={isBusy}>
                      月別変更を保存
                    </button>
                  </div>
                  {setting.overrides.length > 0 ? (
                    <div className="income-override-list">
                      {setting.overrides.map((override) => {
                        const targetMonth = override.target_month.slice(0, 7);
                        return (
                          <span className="badge inactive" key={override.override_id}>
                            {targetMonth}: {formatCurrency(override.amount)} / {override.day}日
                            <button
                              className="inline-delete-button"
                              type="button"
                              aria-label={`${setting.member_name}の${targetMonth}の月別変更を削除`}
                              onClick={() =>
                                deleteOverrideMutation.mutate({
                                  incomeSettingId: setting.income_setting_id,
                                  targetMonth,
                                })
                              }
                              disabled={isBusy}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );

            })}
          </div>
        )}
      </section>
      {messageDialog ? (
        <MessageDialog
          open
          title={messageDialog.title}
          description={messageDialog.description}
          actions={messageDialog.actions}
          tone={messageDialog.tone}
          onAction={messageDialog.onAction}
          onOpenChange={(open) => {
            if (!open) {
              messageDialog.onAction("cancel");
            }
          }}
        />
      ) : null}
    </>
  );
}

function defaultOverrideDraft(setting: IncomeSettingDto): OverrideDraft {
  return {
    targetMonth: getCurrentYearMonth(),
    amount: String(setting.base_amount),
    day: String(setting.base_day),
  };
}

function normalizeOptionalMonth(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  return value;
}

function formatIncomeSettingPeriod(startMonth: string, endMonth: string | null) {
  return endMonth ? `${startMonth} - ${endMonth}` : `${startMonth} から継続`;
}

function getCurrentYearMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date()).slice(0, 7);
}

function IncomeCategoryBadge({ category }: { category: CategoryDto | undefined }) {
  return (
    <span className="badge" style={{ background: category?.color ?? "#e2e8f0" }}>
      {category?.name ?? "カテゴリ未設定"}
    </span>
  );
}
