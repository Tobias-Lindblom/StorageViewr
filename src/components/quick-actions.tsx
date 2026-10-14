import { AppIcon } from "./app-icon";

export type MovementType = "RECEIPT" | "ISSUE" | "TRANSFER" | "CORRECTION";
const movementActions = [
  { type: "RECEIPT", label: "Inleverans", icon: "plus", tone: "success" },
  { type: "ISSUE", label: "Uttag", icon: "minus", tone: "danger" },
  { type: "TRANSFER", label: "Flytta", icon: "transfer", tone: "neutral" },
  { type: "CORRECTION", label: "Korrigera", icon: "edit", tone: "neutral" },
] as const;

export function QuickActions({ admin, onAction }: { admin: boolean; onAction: (type: MovementType) => void }) {
  return <div className={"grid gap-2 " + (admin ? "grid-cols-4" : "grid-cols-3")}>
    {movementActions.filter(item => admin || item.type !== "CORRECTION").map(item =>
      <button key={item.type} type="button" onClick={() => onAction(item.type)}
        className={"quick-action quick-action-" + item.tone} aria-haspopup="dialog">
        <AppIcon name={item.icon} /><span>{item.label}</span>
      </button>)}
  </div>;
}
