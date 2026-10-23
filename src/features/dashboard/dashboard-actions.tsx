"use client";

import Link from "next/link";
import { ScannerButton } from "@/features/scanner/scanner-button";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { BottomSheet } from "@/components/bottom-sheet";
import { StockEditor } from "@/features/inventory/stock-editor";
import type { Choice, EditorActionState } from "@/features/inventory/stock-types";
import { ProductPicker, type PickedProduct } from "./product-picker";

export function DashboardActions({ locations }: { locations: Choice[]; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [action, setAction] = useState<EditorActionState>({ disabled: true, label: "Registrera inleverans" });
  const [notice, setNotice] = useState("");
  const opener = useRef<HTMLElement | null>(null);
  const router = useRouter();

  function close() {
    setOpen(false);
    setProduct(null);
    requestAnimationFrame(() => opener.current?.focus());
  }

  return <section className="dashboard-actions-section" aria-label="Snabbåtgärder">
    <div className="dashboard-actions">
      <Link href="/inventories" className="dashboard-action action-primary">
        <AppIcon name="inventory" width={22} height={22} /><span>Inventera</span>
      </Link>
      <button type="button" aria-haspopup="dialog" className="dashboard-action action-success"
        onClick={() => {
          opener.current = document.activeElement as HTMLElement;
          setProduct(null);
          setNotice("");
          setAction({ disabled: true, label: "Registrera inleverans" });
          setOpen(true);
        }}>
        <AppIcon name="plus" width={22} height={22} /><span>Inleverans</span>
      </button>
      <ScannerButton className="dashboard-action action-neutral">
        <AppIcon name="scan" width={22} height={22} /><span>Skanna</span>
      </ScannerButton>
      <Link href="/reports" className="dashboard-action action-neutral">
        <AppIcon name="document" width={22} height={22} /><span>Rapporter</span>
      </Link>
    </div>
    {notice && <p role="status" className="mt-2 text-xs text-success">{notice}</p>}
    {open && <BottomSheet title="Inleverans" onClose={close}
      footer={product && <button type="submit" form="stock-editor-form" disabled={action.disabled}
        className="button button-receipt w-full">{action.label}</button>}>
      {product ? <>
        <button type="button" disabled={action.label === "Registrerar…"} className="mb-4 inline-flex min-h-11 items-center text-sm text-accent"
          onClick={() => { setProduct(null); setAction({ disabled: true, label: "Registrera inleverans" }); }}>Byt produkt</button>
        <StockEditor key={product.id} scope={{ kind: "product", id: product.id, label: product.name + " · " + product.sku }}
          initialType="RECEIPT" initialChoice="" choices={locations} admin={false}
          onActionStateChange={setAction} onSaved={() => {
            close();
            setNotice("Inleveransen har registrerats.");
            router.refresh();
          }} />
      </> : <ProductPicker onSelect={setProduct} />}
    </BottomSheet>}
  </section>;
}
