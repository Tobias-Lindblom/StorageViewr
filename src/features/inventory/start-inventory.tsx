"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/bottom-sheet";
import { clientApi } from "@/lib/client-api";

export function StartInventory({
  warehouses,
  locations,
}: {
  warehouses: { id: string; name: string }[];
  locations: { id: string; warehouseId: string; code: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const places = locations.filter((row) => row.warehouseId === warehouseId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await clientApi<{ id: string }>(
        "/api/inventory/sessions",
        "POST",
        {
          name: new FormData(event.currentTarget).get("name"),
          warehouseId,
          locationIds: selected,
        },
      );
      router.push("/inventories/" + result.id);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Kunde inte starta inventeringen.",
      );
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="button px-3! sm:px-6!"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        + Starta inventering
      </button>
      {open && (
        <BottomSheet
          title="Starta inventering"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <form onSubmit={submit} className="space-y-5">
            <p className="text-sm leading-7 text-muted">
              Välj lager och platser. Omfattningen låses när inventeringen
              startas.
            </p>
            <label className="block text-sm">
              Namn
              <input
                name="name"
                required
                minLength={2}
                maxLength={120}
                placeholder="Septemberinventering"
                className="input mt-2"
                disabled={busy}
              />
            </label>
            <label className="block text-sm">
              Lager
              <select
                className="input mt-2"
                value={warehouseId}
                disabled={busy}
                onChange={(event) => {
                  setWarehouseId(event.target.value);
                  setSelected([]);
                }}
              >
                {!warehouses.length && (
                  <option value="">Inga aktiva lager</option>
                )}
                {warehouses.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset disabled={busy}>
              <legend className="mb-2 text-sm font-semibold">
                Lagerplatser · {selected.length} valda
              </legend>
              {places.length ? (
                <>
                  <button
                    type="button"
                    className="mb-2 min-h-11 text-sm text-cyan"
                    onClick={() =>
                      setSelected(
                        selected.length === places.length
                          ? []
                          : places.slice(0, 200).map((row) => row.id),
                      )
                    }
                  >
                    {selected.length === places.length
                      ? "Avmarkera alla"
                      : places.length > 200
                        ? "Välj de första 200"
                        : "Välj alla"}
                  </button>
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-line px-3">
                    {places.map((row) => (
                      <label
                        key={row.id}
                        className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-line/50 last:border-0"
                      >
                        <input
                          type="checkbox"
                          className="mt-0! h-4! min-h-0! w-4! shrink-0 px-0! accent-violet-500"
                          checked={selected.includes(row.id)}
                          onChange={(event) =>
                            setSelected(
                              event.target.checked
                                ? [...selected, row.id]
                                : selected.filter((id) => id !== row.id),
                            )
                          }
                        />
                        <span className="break-all text-sm">{row.code}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Högst 200 platser per inventering.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">
                  Skapa aktiva lagerplatser i lagret först.
                </p>
              )}
            </fieldset>
            {error && (
              <p role="alert" className="text-sm text-rose-200">
                {error}
              </p>
            )}
            <button
              className="button w-full"
              disabled={busy || !selected.length || selected.length > 200}
            >
              {busy ? "Startar…" : "Starta inventering"}
            </button>
          </form>
        </BottomSheet>
      )}
    </>
  );
}
