import type { ReactNode } from "react";
import { AppIcon } from "./app-icon";
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="panel py-10 text-center">
      <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-accent">
        <AppIcon name="warehouse" />
      </span>
      <h2>{title}</h2>
      <div className="mx-auto mb-6 max-w-md text-sm leading-7 text-muted">
        {children}
      </div>
      {action}
    </div>
  );
}
