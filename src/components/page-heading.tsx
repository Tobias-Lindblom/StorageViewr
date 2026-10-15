import type { ReactNode } from "react";
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-heading-title">{title}</h1>
        {description && (
          <p className="page-heading-description">{description}</p>
        )}
      </div>
      {action && <div className="page-heading-action">{action}</div>}
    </div>
  );
}
