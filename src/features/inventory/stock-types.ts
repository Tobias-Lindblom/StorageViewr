import type { MovementType } from "@/components/quick-actions";

export type Scope = { kind: "product" | "location"; id: string; label: string };
export type Choice = { id: string; label: string };
export type EditorActionState = { disabled: boolean; label: string; tone?: MovementType };
