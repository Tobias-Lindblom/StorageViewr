"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { BottomSheet } from "@/components/bottom-sheet";
import { StockEditor } from "@/features/inventory/stock-editor";
import type { Choice, EditorActionState } from "@/features/inventory/stock-types";
import type { MovementType } from "@/components/quick-actions";
import { ProductPicker, type PickedProduct } from "./product-picker";

const actions = [
  { type: "RECEIPT", label: "Inleverans", icon: "plus", tone: "success" },
  { type: "ISSUE", label: "Uttag", icon: "minus", tone: "danger" },
  { type: "TRANSFER", label: "Flytta", icon: "transfer", tone: "neutral" },
] as const;

export function DashboardActions({ locations, admin }: { locations: Choice[]; admin: boolean }) {
  const [type, setType] = useState<MovementType | null>(null);
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [action, setAction] = useState<EditorActionState>({ disabled: true, label: "Registrera lagerhändelse" });
  const [notice, setNotice] = useState("");
  const opener = useRef<HTMLElement | null>(null);
  const router = useRouter();
  function close() {
    setType(null);
    setProduct(null);
    requestAnimationFrame(() => opener.current?.focus());
  }
  return (
    <section className="dashboard-actions-section" aria-label="Snabbåtgärder">
      <div className="dashboard-actions">
        {actions.map(item => (
          <button key={item.type} type="button" aria-haspopup="dialog" className={"dashboard-action action-" + item.tone}
            onClick={() => { opener.current = document.activeElement as HTMLElement; setProduct(null); setNotice(""); setAction({ disabled: true, label: "Registrera lagerhändelse" }); setType(item.type); }}>
            <AppIcon name={item.icon} width={22} height={22} /><span>{item.label}</span>
          </button>
        ))}
        <Link href="/scanner" className="dashboard-action action-neutral"><AppIcon name="scan" width={22} height={22} /><span>Skanna</span></Link>
      </div>
      {notice && <p role="status" className="mt-2 text-xs text-success">{notice}</p>}
      {type && (
        <BottomSheet title={actions.find(item => item.type === type)?.label ?? "Lagerhändelse"} onClose={close}
          footer={product && <button type="submit" form="stock-editor-form" disabled={action.disabled}
            className={"button w-full " + (action.tone === "RECEIPT" ? "button-receipt" : action.tone === "ISSUE" ? "button-issue" : "")}>{action.label}</button>}>
          {product ? <>
            <button type="button" disabled={action.label === "Registrerar…"} className="mb-4 inline-flex min-h-11 items-center text-sm text-accent" onClick={() => { setProduct(null); setAction({ disabled: true, label: "Registrera lagerhändelse" }); }}>Byt produkt</button>
            <StockEditor key={product.id} scope={{ kind: "product", id: product.id, label: product.name + " · " + product.sku }}
              initialType={type} initialChoice="" choices={locations} transferLocations={locations} admin={admin}
              onActionStateChange={setAction} onSaved={() => { close(); setNotice("Lagerhändelsen har registrerats."); router.refresh(); }} />
          </> : <ProductPicker onSelect={setProduct} />}
        </BottomSheet>
      )}
    </section>
  );
}
