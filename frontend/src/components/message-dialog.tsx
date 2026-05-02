"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Info, X } from "lucide-react";
import type { ReactNode } from "react";

export type MessageDialogAction = {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "danger";
};

type MessageDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  actions: MessageDialogAction[];
  tone?: "info" | "danger";
  onAction: (actionId: string) => void;
  onOpenChange?: (open: boolean) => void;
};

export function MessageDialog({ open, title, description, actions, tone = "info", onAction, onOpenChange }: MessageDialogProps) {
  const Icon = tone === "danger" ? AlertTriangle : Info;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay message-dialog-overlay" />
        <Dialog.Content className="dialog-content message-dialog-content" aria-describedby="message-dialog-description">
          <div className="dialog-header">
            <div className="message-dialog-title-row">
              <span className={`message-dialog-icon ${tone}`} aria-hidden="true">
                <Icon size={18} />
              </span>
              <Dialog.Title className="dialog-title">{title}</Dialog.Title>
            </div>
            <Dialog.Close className="icon-button" aria-label="閉じる">
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description id="message-dialog-description" className="message-dialog-description" asChild>
            <div>{description}</div>
          </Dialog.Description>
          <div className="modal-actions">
            {actions.map((action) => (
              <button
                key={action.id}
                className={`button ${action.variant === "secondary" ? "secondary" : ""} ${action.variant === "danger" ? "danger" : ""}`}
                type="button"
                onClick={() => onAction(action.id)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
