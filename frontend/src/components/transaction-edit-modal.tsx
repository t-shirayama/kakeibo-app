"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import type { TransactionRequest } from "@/lib/api";
import type { CategoryDto, TransactionDto } from "@/lib/types";

type TransactionEditModalProps = {
  categories: CategoryDto[];
  open: boolean;
  transaction: TransactionDto | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: TransactionRequest) => Promise<void>;
  error?: Error | null;
  isSubmitting?: boolean;
};

export function TransactionEditModal({
  categories,
  open,
  transaction,
  onOpenChange,
  onSubmit,
  error,
  isSubmitting = false,
}: TransactionEditModalProps) {
  const title = transaction ? "明細を編集" : "明細を追加";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" aria-describedby="transaction-edit-description">
          <div className="dialog-header">
            <Dialog.Title className="dialog-title">{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="閉じる">
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description id="transaction-edit-description" className="sr-only">
            取引明細の日付、店名、カテゴリ、金額、支払い方法、メモを編集します。
          </Dialog.Description>

          <form
            className="modal-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              await onSubmit({
                transaction_date: String(formData.get("transaction_date") ?? ""),
                shop_name: String(formData.get("shop_name") ?? ""),
                amount: Number(formData.get("amount") ?? 0),
                transaction_type: "expense",
                category_id: String(formData.get("category_id") || "") || null,
                payment_method: String(formData.get("payment_method") || "") || null,
                memo: String(formData.get("memo") || "") || null,
              });
            }}
          >
            {error ? <ApiErrorAlert error={error} /> : null}
            <div className="form-field horizontal">
              <label htmlFor="transaction-date">日付</label>
              <input id="transaction-date" name="transaction_date" type="date" defaultValue={transaction?.transaction_date ?? ""} required />
            </div>
            <div className="form-field horizontal">
              <label htmlFor="merchant-name">店名</label>
              <input id="merchant-name" name="shop_name" type="text" defaultValue={transaction?.shop_name ?? ""} required />
            </div>
            <div className="form-field horizontal">
              <label htmlFor="category">カテゴリ</label>
              <select id="category" name="category_id" defaultValue={transaction?.category_id ?? categories[0]?.category_id}>
                {categories.map((category) => (
                  <option value={category.category_id} key={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field horizontal">
              <label htmlFor="amount">金額</label>
              <input id="amount" className="numeric-input-plain" name="amount" type="number" inputMode="numeric" defaultValue={transaction?.amount ?? 0} required />
            </div>
            <div className="form-field horizontal">
              <label htmlFor="payment-method">支払い方法</label>
              <input id="payment-method" name="payment_method" type="text" defaultValue={transaction?.payment_method ?? ""} />
            </div>
            <div className="form-field horizontal">
              <label htmlFor="memo">メモ</label>
              <input id="memo" name="memo" type="text" defaultValue={transaction?.memo ?? ""} />
            </div>

            <div className="modal-actions">
              <Dialog.Close className="button secondary" type="button">
                キャンセル
              </Dialog.Close>
              <button className="button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "保存中" : transaction ? "保存" : "追加"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
