"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import type { CategoryRequest } from "@/lib/api";

type CategoryEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: CategoryRequest) => Promise<void>;
  error?: Error | null;
  isSubmitting?: boolean;
};

export function CategoryEditModal({
  open,
  onOpenChange,
  onSubmit,
  error,
  isSubmitting = false,
}: CategoryEditModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" aria-describedby="category-edit-description">
          <div className="dialog-header">
            <Dialog.Title className="dialog-title">カテゴリを追加</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="閉じる">
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description id="category-edit-description" className="sr-only">
            カテゴリ名、色、説明を入力してカテゴリを追加します。
          </Dialog.Description>

          <form
            className="modal-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              await onSubmit({
                name: String(formData.get("name") ?? ""),
                color: String(formData.get("color") ?? "#2f7df6"),
                description: String(formData.get("description") || "") || null,
              });
            }}
          >
            {error ? <ApiErrorAlert error={error} /> : null}
            <div className="form-field horizontal">
              <label htmlFor="category-name">カテゴリ名</label>
              <input id="category-name" name="name" type="text" required />
            </div>
            <div className="form-field horizontal">
              <label htmlFor="category-color">色</label>
              <input id="category-color" name="color" type="color" defaultValue="#2f7df6" required />
            </div>
            <div className="form-field horizontal">
              <label htmlFor="category-description">説明</label>
              <input id="category-description" name="description" type="text" />
            </div>

            <div className="modal-actions">
              <Dialog.Close className="button secondary" type="button">
                キャンセル
              </Dialog.Close>
              <button className="button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "追加中" : "追加"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
