"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import type { CategoryRequest } from "@/lib/api";
import type { CategoryDto } from "@/lib/types";

type CategoryEditModalProps = {
  open: boolean;
  category: CategoryDto | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: CategoryRequest) => Promise<void>;
  error?: Error | null;
  isSubmitting?: boolean;
  showMonthlyBudget?: boolean;
};

export function CategoryEditModal({
  open,
  category,
  onOpenChange,
  onSubmit,
  error,
  isSubmitting = false,
  showMonthlyBudget = true,
}: CategoryEditModalProps) {
  const title = category ? "カテゴリを編集" : "カテゴリを追加";
  const submitLabel = category ? "保存" : "追加";
  const submittingLabel = category ? "保存中" : "追加中";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" aria-describedby="category-edit-description">
          <div className="dialog-header">
            <Dialog.Title className="dialog-title">{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="閉じる">
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description id="category-edit-description" className="sr-only">
            カテゴリ名、色、説明、月次予算を入力してカテゴリを保存します。
          </Dialog.Description>

          <form
            key={category?.category_id ?? "new-category"}
            className="modal-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              await onSubmit({
                name: String(formData.get("name") ?? ""),
                color: String(formData.get("color") ?? "#2f7df6"),
                description: String(formData.get("description") || "") || null,
                monthly_budget: showMonthlyBudget ? normalizeBudget(formData.get("monthly_budget")) : category?.monthly_budget ?? null,
              });
            }}
          >
            {error ? <ApiErrorAlert error={error} /> : null}
            <div className="form-field horizontal">
              <label htmlFor="category-name">カテゴリ名</label>
              <input id="category-name" name="name" type="text" defaultValue={category?.name ?? ""} required />
            </div>
            <div className="form-field horizontal">
              <label htmlFor="category-color">色</label>
              <input id="category-color" name="color" type="color" defaultValue={category?.color ?? "#2f7df6"} required />
            </div>
            <div className="form-field horizontal">
              <label htmlFor="category-description">説明</label>
              <input id="category-description" name="description" type="text" defaultValue={category?.description ?? ""} />
            </div>
            {showMonthlyBudget ? (
              <div className="form-field horizontal">
                <label htmlFor="category-monthly-budget">月次予算</label>
                <input
                  id="category-monthly-budget"
                  className="numeric-input-plain"
                  name="monthly_budget"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  defaultValue={category?.monthly_budget ?? ""}
                />
              </div>
            ) : null}

            <div className="modal-actions">
              <Dialog.Close className="button secondary" type="button">
                キャンセル
              </Dialog.Close>
              <button className="button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? submittingLabel : submitLabel}
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
