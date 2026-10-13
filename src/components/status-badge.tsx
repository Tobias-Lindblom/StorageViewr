import type { ReactNode } from "react";

export function StatusBadge({ children, tone = "neutral" }: {
  children: ReactNode;
  tone?: "success" | "warning" | "danger" | "neutral";
}) {
  const colors = {
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    danger: "border-destructive/30 bg-destructive/10 text-destructive",
    neutral: "border-line bg-surface-raised text-muted",
  };
  return <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " + colors[tone]}>{children}</span>;
}
