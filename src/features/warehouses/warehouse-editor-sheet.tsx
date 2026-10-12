"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/bottom-sheet";
import { WarehouseForm } from "./warehouse-form";
import type { getWarehouse } from "./service";

type Warehouse = Awaited<ReturnType<typeof getWarehouse>>;

export function WarehouseEditorSheet({
  initial,
  label,
  className,
}: {
  initial?: Warehouse;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const editing = Boolean(initial);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={className ?? (editing ? "button-secondary" : "button")}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
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
              setOpen(false);
              if (!editing) router.push("/warehouses/" + id);
              router.refresh();
            }}
          />
        </BottomSheet>
      )}
    </>
  );
}
