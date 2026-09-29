"use client";
import { MaterialArrow } from "@/components/material-arrow";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-api";
import { locationBatchSchema, locationCode } from "@/validation/location";
import type { getLocation } from "./service";

type WarehouseOption = { id: string; name: string };
export function LocationForm({
  warehouses,
  warehouseId,
  initial,
}: {
  warehouses: WarehouseOption[];
  warehouseId?: string;
  initial?: Awaited<ReturnType<typeof getLocation>>;
}) {
  const router = useRouter();
  const [zone, setZone] = useState(initial?.zone ?? "A");
  const [shelf, setShelf] = useState(initial?.shelf ?? "01");
  const [position, setPosition] = useState(initial?.position ?? "1");
  const [count, setCount] = useState("10");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const preview = locationBatchSchema.safeParse({
    warehouseId: initial?.warehouseId ?? warehouseId ?? warehouses[0]?.id,
    zone,
    shelf,
    startPosition: Number(position),
    count: initial ? 1 : Number(count),
  });
  const first = preview.success
    ? locationCode({
        ...preview.data,
        position: String(preview.data.startPosition).padStart(2, "0"),
      })
    : "";
  const last = preview.success
    ? locationCode({
        ...preview.data,
        position: String(
          preview.data.startPosition + preview.data.count - 1,
        ).padStart(2, "0"),
      })
    : "";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (initial) {
        await clientApi("/api/locations/" + initial.id, "PATCH", {
          zone,
          shelf,
          position,
          active: form.get("active") === "on",
        });
        router.push("/locations/" + initial.id);
      } else {
        const result = await clientApi<{ id: string }[]>(
          "/api/locations/batch",
          "POST",
          {
            warehouseId: form.get("warehouseId"),
            zone,
            shelf,
            startPosition: Number(position),
            count: Number(count),
          },
        );
        router.push(
          result.length === 1
            ? "/locations/" + result[0].id
            : "/locations?warehouseId=" + form.get("warehouseId"),
        );
      }
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Kunde inte spara lagerplatserna.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="max-w-2xl space-y-8">
      <fieldset disabled={pending}>
        <section aria-labelledby="location-information-heading">
          <h2 id="location-information-heading" className="mb-4! text-xl!">
            Platsuppgifter
          </h2>
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            {initial ? (
              <div>
                <p className="text-xs text-muted">Lager</p>
                <p className="mt-2 text-sm font-medium">{initial.warehouseName}</p>
              </div>
            ) : (
              <label>
                Lager
                <select
                  name="warehouseId"
                  required
                  defaultValue={warehouseId ?? warehouses[0]?.id}
                >
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="mt-5 grid grid-cols-2 gap-4">
              <label>
                Zon
                <input
                  name="zone"
                  required
                  maxLength={8}
                  value={zone}
                  onChange={(event) => setZone(event.target.value)}
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </label>
              <label>
                Sektion
                <input
                  name="shelf"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{1,3}"
                  maxLength={3}
                  value={shelf}
                  onChange={(event) => setShelf(event.target.value)}
                />
              </label>
              <label>
                {initial ? "Position" : "Första position"}
                <input
                  name="position"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{1,3}"
                  maxLength={3}
                  value={position}
                  onChange={(event) => setPosition(event.target.value)}
                />
              </label>
              {!initial && (
                <label>
                  Antal platser
                  <input
                    name="count"
                    type="number"
                    required
                    min={1}
                    max={100}
                    step={1}
                    value={count}
                    onChange={(event) => setCount(event.target.value)}
                  />
                </label>
              )}
            </div>

            <div className="mt-5 border-t border-line/60 pt-5" aria-live="polite">
              <p className="mb-2 text-xs text-muted">
                {initial ? "Platskod" : "Platskoder som skapas"}
              </p>
              <p className="flex min-h-11 items-center gap-2 rounded-xl bg-canvas px-4 font-mono text-sm text-accent">
                {first ? (
                  first === last ? (
                    first
                  ) : (
                    <>
                      <span className="break-all">{first}</span>
                      <span className="sr-only">till</span>
                      <MaterialArrow name="forward" size={18} />
                      <span className="break-all">{last}</span>
                    </>
                  )
                ) : (
                  <span className="font-sans text-muted">Ange giltiga platsuppgifter.</span>
                )}
              </p>
            </div>

            {initial && (
              <div className="mt-5 border-t border-line/60 pt-5">
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    className="m-0! h-5! min-h-0! w-5! accent-violet-500"
                    type="checkbox"
                    name="active"
                    defaultChecked={initial.active}
                  />
                  Aktiv lagerplats
                </label>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Platsen måste ha nollsaldo innan den kan inaktiveras. QR-länken behålls om platskoden ändras.
                </p>
              </div>
            )}
          </div>
        </section>
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 border-t border-line/60 pt-6 sm:flex-row sm:justify-end">
        <Link
          className="button-secondary w-full sm:w-auto"
          href={initial ? "/locations/" + initial.id : "/locations"}
        >
          Avbryt
        </Link>
        <button className="button w-full sm:w-auto" disabled={pending}>
          {pending
            ? "Sparar…"
            : initial
              ? "Spara lagerplats"
              : "Skapa lagerplatser"}
        </button>
      </div>
    </form>
  );
}
