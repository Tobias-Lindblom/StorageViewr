import { AppIcon } from "./app-icon";

export type MovementType = "RECEIPT" | "CORRECTION";
export type QuickActionType = MovementType | "TRANSFER";
const movementActions = [
  { type: "RECEIPT", label: "Inleverans", icon: "plus", tone: "success" },
  { type: "TRANSFER", label: "Flytta", icon: "transfer", tone: "neutral" },
  { type: "CORRECTION", label: "Korrigera", icon: "edit", tone: "neutral" },
] as const;

export function QuickActions({ admin, onAction }: { admin: boolean; onAction: (type: QuickActionType) => void }) {
  return <div className={"grid gap-2 " + (admin ? "grid-cols-3" : "grid-cols-2")}>
    {movementActions.filter(item => admin || item.type !== "CORRECTION").map(item =>
      <button key={item.type} type="button" onClick={() => onAction(item.type)}
        className={"quick-action quick-action-" + item.tone} aria-haspopup="dialog">
        <AppIcon name={item.icon} /><span>{item.label}</span>
      </button>)}
  </div>;
}
