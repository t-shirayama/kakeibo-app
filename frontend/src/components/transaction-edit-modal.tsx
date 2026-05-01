"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { CategoryDto, TransactionDto } from "@/lib/types";

type TransactionEditModalProps = {
  categories: CategoryDto[];
  open: boolean;
  transaction: TransactionDto | null;
  onOpenChange: (open: boolean) => void;
};

export function TransactionEditModal({ categories, open, transaction, onOpenChange }: TransactionEditModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" aria-describedby="transaction-edit-description">
          <div className="dialog-header">
            <Dialog.Title className="dialog-title">明細を編集</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="閉じる">
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description id="transaction-edit-description" className="sr-only">
            取引明細の日付、店名、カテゴリ、金額、支払い方法、メモを編集します。
          </Dialog.Description>

          <form className="modal-form">
            <div className="form-field horizontal">
              <label htmlFor="transaction-date">日付</label>
              <input id="transaction-date" type="date" defaultValue={transaction?.transaction_date ?? ""} />
            </div>
            <div className="form-field horizontal">
              <label htmlFor="merchant-name">店名</label>
              <input id="merchant-name" type="text" defaultValue={transaction?.merchant_name ?? ""} />
            </div>
            <div className="form-field horizontal">
              <label htmlFor="category">カテゴリ</label>
              <select id="category" defaultValue={transaction?.category_id ?? categories[0]?.category_id}>
                {categories.map((category) => (
                  <option value={category.category_id} key={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field horizontal">
              <label htmlFor="amount">金額</label>
              <input id="amount" type="number" inputMode="numeric" defaultValue={transaction?.amount ?? 0} />
            </div>
            <div className="form-field horizontal">
              <label htmlFor="payment-method">支払い方法</label>
              <input id="payment-method" type="text" defaultValue={transaction?.payment_method ?? ""} />
            </div>
            <div className="form-field horizontal">
              <label htmlFor="memo">メモ</label>
              <input id="memo" type="text" defaultValue={transaction?.memo ?? ""} />
            </div>

            <div className="modal-actions">
              <Dialog.Close className="button secondary" type="button">
                キャンセル
              </Dialog.Close>
              <button className="button" type="submit">
                保存
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
