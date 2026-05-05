"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { ApiErrorAlert } from "@/components/api-error-alert";

type BudgetEditModalProps = {
  open: boolean;
  categoryName: string;
  initialBudget: number | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (monthlyBudget: number | null) => Promise<void>;
  error?: Error | null;
  isSubmitting?: boolean;
};

export function BudgetEditModal({
  open,
  categoryName,
  initialBudget,
  onOpenChange,
  onSubmit,
  error,
  isSubmitting = false,
}: BudgetEditModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" aria-describedby="budget-edit-description">
          <div className="dialog-header">
            <Dialog.Title className="dialog-title">月次予算を設定</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="閉じる">
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description id="budget-edit-description" className="sr-only">
            選択したカテゴリの月次予算を設定または解除します。
          </Dialog.Description>

          <form
            key={`${categoryName}-${initialBudget ?? "unset"}`}
            className="modal-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              await onSubmit(normalizeBudget(formData.get("monthly_budget")));
            }}
          >
            {error ? <ApiErrorAlert error={error} /> : null}
            <div className="form-field horizontal">
              <label>カテゴリ</label>
              <div className="input wide read-only-field">{categoryName}</div>
            </div>
            <div className="form-field horizontal">
              <label htmlFor="budget-monthly-budget">月次予算</label>
              <input
                id="budget-monthly-budget"
                className="numeric-input-plain"
                name="monthly_budget"
                type="number"
                min="0"
                inputMode="numeric"
                defaultValue={initialBudget ?? ""}
                placeholder="未設定"
              />
            </div>
            <p className="muted modal-note">空欄で保存すると、このカテゴリの月次予算を解除します。</p>

            <div className="modal-actions">
              <Dialog.Close className="button secondary" type="button">
                キャンセル
              </Dialog.Close>
              <button className="button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "保存中" : "保存"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function normalizeBudget(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
