"use client";

import { useRef, useState, type FormEvent } from "react";
import { AppIcon } from "@/components/app-icon";
import { BottomSheet } from "@/components/bottom-sheet";

export type LocationFiltersValue = {
  warehouseId: string;
  occupancy: "all" | "occupied" | "empty";
  status: "active" | "inactive" | "all";
};
export function LocationFilters({ value, warehouses, admin, onApply }: {
  value: LocationFiltersValue;
  warehouses: { id: string; name: string; active: boolean }[];
  admin: boolean;
  onApply: (value: LocationFiltersValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const filtered = Boolean(value.warehouseId || value.occupancy !== "all" || value.status !== "active");
  function close() {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onApply({
      warehouseId: String(form.get("warehouseId") ?? ""),
      occupancy: form.get("occupancy") as LocationFiltersValue["occupancy"],
      status: admin ? form.get("status") as LocationFiltersValue["status"] : "active",
    });
    close();
  }
  return <>
    <button type="button" ref={trigger} className="location-filter-trigger" aria-haspopup="dialog"
      aria-label={filtered ? "Filter, aktiva filter" : "Filter"} onClick={() => setOpen(true)}>
      <AppIcon name="filter" width={20} height={20} />
      {filtered && <span aria-hidden="true" className="location-filter-dot" />}
    </button>
    {open && <BottomSheet title="Filtrera lagerplatser" onClose={close}
      footer={<button type="submit" form="location-filter-form" className="button w-full">Tillämpa filter</button>}>
      <form id="location-filter-form" onSubmit={apply} className="space-y-5">
        <label>Lager<select name="warehouseId" defaultValue={value.warehouseId}>
          <option value="">Alla lager</option>
          {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>
            {warehouse.name}{!warehouse.active && " (inaktivt)"}
          </option>)}
        </select></label>
        <label>Beläggning<select name="occupancy" defaultValue={value.occupancy}>
          <option value="all">Alla platser</option>
          <option value="occupied">Upptagna</option>
          <option value="empty">Tomma</option>
        </select></label>
        {admin && <label>Platsstatus<select name="status" defaultValue={value.status}>
          <option value="active">Aktiva</option><option value="inactive">Inaktiva</option><option value="all">Alla</option>
        </select></label>}
        <button type="button" className="location-tools-link" onClick={() => {
          onApply({ warehouseId: "", occupancy: "all", status: "active" }); close();
        }}>Rensa filter</button>
      </form>
    </BottomSheet>}
  </>;
}
