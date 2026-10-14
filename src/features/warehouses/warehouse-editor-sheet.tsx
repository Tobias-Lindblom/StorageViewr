"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/bottom-sheet";
import { WarehouseForm } from "./warehouse-form";
import type { getWarehouse } from "./service";

type Warehouse = Awaited<ReturnType<typeof getWarehouse>>;

export function WarehouseEditorSheet({
  initial,
  label,
  className,
  onOpen,
  onClose,
}: {
  initial?: Warehouse;
  label?: ReactNode;
  className?: string;
  onOpen?: () => void;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const editing = Boolean(initial);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => { if (onClose) onClose(); else trigger.current?.focus(); });
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={className ?? (editing ? "button-secondary" : "button")}
        aria-haspopup="dialog"
        onClick={() => { onOpen?.(); setOpen(true); }}
      >
        {label ?? (editing ? "Redigera lager" : "+ Lägg till lager")}
      </button>
      {open && (
        <BottomSheet
          title={editing ? "Redigera lager" : "Nytt lager"}
          onClose={close}
          footer={
            <button
              type="submit"
              form="warehouse-editor-form"
              className="button w-full"
              disabled={pending}
            >
              {pending
                ? "Sparar…"
                : editing
                  ? "Spara lager"
                  : "Skapa lager"}
            </button>
          }
        >
          <p className="mb-6 text-sm leading-6 text-muted">
            {editing
              ? "Uppdatera lagrets namn, kod, adress eller status."
              : "Lägg till en fysisk lageradress eller lagerbyggnad."}
          </p>
          <WarehouseForm
            id="warehouse-editor-form"
            initial={initial}
            embedded
            hideSubmit
            onPendingChange={setPending}
            onSaved={(id) => {
              close();
              if (!editing) router.push("/locations?" + new URLSearchParams({ warehouseId: id }));
              router.refresh();
            }}
          />
        </BottomSheet>
      )}
    </>
  );
}
