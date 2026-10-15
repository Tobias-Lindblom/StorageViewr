import type { ComponentProps, ReactNode } from "react";
import { AppIcon } from "./app-icon";
export function EmptyState({
  title,
  children,
  action,
  icon = "warehouse",
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  icon?: ComponentProps<typeof AppIcon>["name"];
}) {
  return (
    <div className="panel empty-state">
      <span className="empty-state-icon">
        <AppIcon name={icon} />
      </span>
      <h2>{title}</h2>
      <div className="empty-state-description">
        {children}
      </div>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
