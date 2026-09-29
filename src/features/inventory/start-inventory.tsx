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
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const places = locations.filter((row) => row.warehouseId === warehouseId);
  const visiblePlaces = places.filter((row) =>
    row.code.toLocaleLowerCase("sv").includes(search.trim().toLocaleLowerCase("sv")),
  );
  const allVisibleSelected =
    visiblePlaces.length > 0 &&
    visiblePlaces.every((row) => selected.includes(row.id));

  function toggleVisiblePlaces() {
    const visibleIds = new Set(visiblePlaces.map((row) => row.id));
    if (allVisibleSelected) {
      setSelected(selected.filter((id) => !visibleIds.has(id)));
      return;
    }
    setSelected(
      Array.from(new Set([...selected, ...visibleIds])).slice(0, 200),
    );
  }

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
        className="button w-full px-4! sm:w-auto sm:px-6!"
        onClick={() => {
          setError("");
          setSearch("");
          setSelected([]);
          setWarehouseId(warehouses[0]?.id ?? "");
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
          footer={
            <>
              {error && (
                <p role="alert" className="error mb-3">
                  {error}
                </p>
              )}
              <button
                type="submit"
                form="start-inventory-form"
                className="button w-full"
                disabled={busy || !selected.length || selected.length > 200}
              >
                {busy ? "Startar…" : "Starta inventering · " + selected.length + " platser"}
              </button>
            </>
          }
        >
          <form id="start-inventory-form" onSubmit={submit}>
            <p className="text-sm leading-6 text-muted">
              Välj lager och platser som ska räknas. Urvalet låses när inventeringen startar.
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label>
                Namn
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="Exempel: Septemberinventering"
                  disabled={busy}
                />
              </label>
              <label>
                Lager
                <select
                  value={warehouseId}
                  disabled={busy}
                  onChange={(event) => {
                    setWarehouseId(event.target.value);
                    setSelected([]);
                    setSearch("");
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
            </div>

            <fieldset disabled={busy} className="mt-7 border-t border-line/60 pt-6">
              <legend className="sr-only">Välj lagerplatser</legend>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold">Lagerplatser</h3>
                <span className="text-xs text-accent" aria-live="polite">
                  {selected.length} valda
                </span>
              </div>

              {places.length ? (
                <>
                  {places.length > 8 && (
                    <label className="mt-4 block">
                      <span className="sr-only">Sök lagerplats</span>
                      <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Sök platskod"
                      />
                    </label>
                  )}

                  <div className="mt-3 flex min-h-11 items-center justify-between gap-3">
                    <p className="text-xs text-muted">
                      {search
                        ? visiblePlaces.length + " träffar"
                        : places.length + " tillgängliga platser"}
                    </p>
                    {visiblePlaces.length > 0 && (
                      <button
                        type="button"
                        className="min-h-11 text-sm text-cyan"
                        onClick={toggleVisiblePlaces}
                      >
                        {allVisibleSelected
                          ? search ? "Avmarkera visade" : "Avmarkera alla"
                          : search ? "Välj visade" : places.length > 200 ? "Välj de första 200" : "Välj alla"}
                      </button>
                    )}
                  </div>

                  {visiblePlaces.length ? (
                    <div className="overflow-hidden rounded-xl border border-line bg-canvas">
                      {visiblePlaces.map((row) => {
                        const checked = selected.includes(row.id);
                        return (
                          <label
                            key={row.id}
                            className={
                              "flex min-h-12 cursor-pointer items-center gap-3 border-b border-line/50 px-4 transition last:border-0 " +
                              (checked ? "bg-violet-500/10" : "hover:bg-surface-raised")
                            }
                          >
                            <input
                              type="checkbox"
                              className="mt-0! h-4! min-h-0! w-4! shrink-0 px-0! accent-violet-500"
                              checked={checked}
                              disabled={!checked && selected.length >= 200}
                              onChange={(event) =>
                                setSelected(
                                  event.target.checked
                                    ? [...selected, row.id]
                                    : selected.filter((id) => id !== row.id),
                                )
                              }
                            />
                            <span className="break-all text-sm font-normal">{row.code}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-line bg-canvas p-4 text-sm text-muted">
                      Ingen lagerplats matchar sökningen.
                    </p>
                  )}
                  <p className="mt-3 text-xs text-muted">Högst 200 platser per inventering.</p>
                </>
              ) : (
                <p className="mt-4 rounded-xl border border-line bg-canvas p-4 text-sm leading-6 text-muted">
                  Det finns inga aktiva lagerplatser i det valda lagret.
                </p>
              )}
            </fieldset>

          </form>
        </BottomSheet>
      )}
    </>
  );
}
