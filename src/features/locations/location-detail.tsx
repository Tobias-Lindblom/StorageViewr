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

      <header className="mb-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1
              className="mb-0! break-all text-3xl! font-bold sm:text-4xl!"
            >
              {location.code}
            </h1>
            <p className="mt-2 wrap-break-word text-sm text-muted">
              {location.warehouseName}
            </p>
          </div>
          <span
            className={
              "inline-flex shrink-0 items-center gap-2 pt-2 text-xs " +
              (location.active && location.warehouseActive
                ? "text-cyan"
                : "text-muted")
            }
          >
            <span
              aria-hidden="true"
              className={
                "h-1.5 w-1.5 rounded-full " +
                (location.active && location.warehouseActive
                  ? "bg-cyan"
                  : "bg-muted")
              }
            />
            {location.active && location.warehouseActive ? "Aktiv" : "Inaktiv"}
          </span>
        </div>

        {admin && location.warehouseActive && (
          <div className="mt-5">
            <Link
              className="button-secondary w-full sm:w-auto"
              href={"/locations/" + location.id + "/edit"}
            >
              Redigera plats
            </Link>
          </div>
        )}
      </header>

      <section aria-labelledby="location-details-heading">
        <h2 id="location-details-heading" className="mb-4! text-xl!">
          Platsuppgifter
        </h2>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <dl className="grid grid-cols-3 gap-4 p-5 text-sm sm:gap-6 sm:p-6">
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

          {qr && (
            <div className="border-t border-line/60 p-5 sm:grid sm:grid-cols-[minmax(0,1fr)_160px] sm:items-center sm:gap-7 sm:p-6">
              <div className="min-w-0">
                <h3 className="mb-2! text-base!">QR-kod</h3>
                <p className="text-sm leading-6 text-muted">
                  Används vid inventering och för att öppna platsen direkt.
                </p>
              </div>
              <Image
                src={qr.image}
                alt={"QR-kod för " + location.code}
                width={160}
                height={160}
                unoptimized
                className="mx-auto mt-5 h-auto w-40 max-w-full rounded-xl bg-white sm:mt-0"
              />
            </div>
          )}
        </div>
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
