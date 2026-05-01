import { FileSearch, Loader2, SearchX } from "lucide-react";

type StateBlockProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "empty" | "loading" | "error";
};

export function StateBlock({ title, description, action, variant = "empty" }: StateBlockProps) {
  const Icon = variant === "loading" ? Loader2 : variant === "error" ? SearchX : FileSearch;

  return (
    <div className={`state-block ${variant}`}>
      <Icon className={variant === "loading" ? "spin" : undefined} size={28} aria-hidden="true" />
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <div className="state-action">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ title = "読み込み中です" }: { title?: string }) {
  return <StateBlock title={title} description="データを取得しています。" variant="loading" />;
}

export function EmptyState({
  title = "データがありません",
  description = "条件を変更するか、新しいデータを追加してください。",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return <StateBlock title={title} description={description} action={action} />;
}
