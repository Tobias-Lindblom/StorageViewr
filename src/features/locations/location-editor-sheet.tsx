"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/bottom-sheet";
import { LocationForm } from "./location-form";
import type { getLocation } from "./service";

type Location = Awaited<ReturnType<typeof getLocation>>;
type WarehouseOption = { id: string; name: string };

export function LocationEditorSheet({
  warehouses,
  warehouseId,
  initial,
  label,
  className,
  initialCount,
}: {
  warehouses: WarehouseOption[];
  warehouseId?: string;
  initial?: Location;
  label?: string;
  className?: string;
  initialCount?: number;
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
        {label ?? (editing ? "Redigera plats" : "+ Skapa platser")}
      </button>
      {open && (
        <BottomSheet
          title={editing ? "Redigera lagerplats" : "Skapa lagerplatser"}
          onClose={close}
          footer={
            <button
              type="submit"
              form="location-editor-form"
              className="button w-full"
              disabled={pending}
            >
              {pending
                ? "Sparar…"
                : editing
                  ? "Spara lagerplats"
                  : "Skapa lagerplatser"}
            </button>
          }
        >
          <p className="mb-6 text-sm leading-6 text-muted">
            {editing
              ? "Uppdatera platskod eller ändra lagerplatsens status."
              : "Skapa en lagerplats eller en följd med upp till 100 positioner."}
          </p>
          <LocationForm
            id="location-editor-form"
            warehouses={warehouses}
            warehouseId={warehouseId}
            initial={initial}
            initialCount={initialCount}
            embedded
            hideSubmit
            showDelete={false}
            onPendingChange={setPending}
            onSaved={(target) => {
              setOpen(false);
              if (!editing) router.push(target);
              router.refresh();
            }}
          />
        </BottomSheet>
      )}
    </>
  );
}
