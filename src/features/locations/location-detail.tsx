import { MaterialArrow } from "@/components/material-arrow";
import Image from "next/image";
import Link from "next/link";
import { locationQr } from "./labels";
import type { getLocation } from "./service";
import type { TenantContext } from "@/lib/server/tenant";
import { StockPanel } from "@/features/inventory/stock-panel";

export async function LocationDetail({
  location,
  admin,
  context,
}: {
  location: Awaited<ReturnType<typeof getLocation>>;
  admin: boolean;
  context: TenantContext;
}) {
  const qr =
    location.active && location.warehouseActive
      ? await locationQr(location.qrToken)
      : null;
  return (
    <>
      <Link
        href="/locations"
        className="mb-4 inline-flex min-h-13 items-center gap-2 text-sm text-accent"
      >
        <MaterialArrow name="back" />
        Alla lagerplatser
      </Link>

      <section className="panel" aria-labelledby="location-details-heading">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1
              id="location-details-heading"
              className="mb-0! break-all text-xl! font-semibold sm:text-2xl!"
            >
              {location.code}
            </h1>
            <p className="mt-2 wrap-break-word text-sm text-muted">
              {location.warehouseName}
            </p>
          </div>
          <span
            className={
              "rounded-full border px-3 py-1 text-xs font-medium " +
              (location.active
                ? "border-cyan/20 bg-cyan/5 text-cyan"
                : "border-line bg-canvas text-muted")
            }
          >
            {location.active ? "Aktiv" : "Inaktiv"}
          </span>
        </div>

        <div
          className={
            qr
              ? "grid gap-7 md:grid-cols-[minmax(0,1fr)_280px] md:items-start"
              : ""
          }
        >
          <div className="min-w-0">
            <h2 className="mb-5! text-lg!">Platsuppgifter</h2>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-6 text-sm sm:grid-cols-3">
              {[
                ["Zon", location.zone],
                ["Sektion", location.shelf],
                ["Position", location.position],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-2 break-all font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {qr && (
            <div className="flex flex-col items-center rounded-2xl border border-line/60 bg-canvas p-4">
              <h2 className="mb-4! text-base!">Platsens QR-kod</h2>
              <Image
                src={qr.image}
                alt={"QR-kod för " + location.code}
                width={196}
                height={196}
                unoptimized
                className="h-auto max-w-full rounded-xl bg-white"
              />
            </div>
          )}
        </div>

        {admin && location.warehouseActive && (
          <div className="mt-7 flex justify-end border-t border-line/60 pt-5">
            <Link
              className="button-secondary w-full sm:w-auto"
              href={"/locations/" + location.id + "/edit"}
            >
              Redigera plats
            </Link>
          </div>
        )}
      </section>

      <StockPanel
        context={context}
        kind="location"
        id={location.id}
        label={location.warehouseName + " · " + location.code}
        active={location.active && location.warehouseActive}
      />
    </>
  );
}
