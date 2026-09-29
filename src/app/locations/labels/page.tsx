import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { MaterialArrow } from "@/components/material-arrow";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import { PrintButton } from "@/components/print-button";
import { getLabels, qrOrigin } from "@/features/locations/labels";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ warehouseId?: string }>;
}) {
  const context = await pageTenant();
  const { warehouseId } = await searchParams;
  const labels = await pageResource(() => getLabels(context, warehouseId));
  const origin = qrOrigin();
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(origin).hostname,
  );
  return (
    <AppShell context={context}>
      <div className="print-hidden">
        <Link
          href="/locations"
          className="mb-4 inline-flex min-h-13 items-center gap-2 text-sm text-accent"
        >
          <MaterialArrow name="back" />
          Alla lagerplatser
        </Link>
        <PageHeading
          title="QR-etiketter"
          description={
            labels.length === 1
              ? "1 etikett för en aktiv lagerplats."
              : labels.length + " etiketter för aktiva lagerplatser."
          }
          action={labels.length ? <PrintButton /> : undefined}
        />
        <div className="mb-7 overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="p-4 sm:p-5">
            <p className="text-xs text-muted">QR-adress</p>
            <p className="mt-2 break-all text-sm font-medium">{origin}</p>
          </div>
          {local && (
            <p className="border-t border-line/60 p-4 text-xs leading-5 text-muted sm:px-5">
              Adressen använder localhost och kan bara öppnas på den här enheten. Använd en nåbar nätverksadress innan etiketterna skannas med mobilen.
            </p>
          )}
        </div>
        {labels.length > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="mb-0! text-xl!">Förhandsgranskning</h2>
            <span className="text-xs text-muted">{labels.length} st</span>
          </div>
        )}
      </div>
      {labels.length ? (
        <div className="label-sheet grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {labels.map((label) => (
            <article
              key={label.id}
              className="qr-label flex flex-col items-center rounded-xl bg-white p-5 text-center text-black shadow-sm shadow-black/20"
            >
              <p className="mb-1 text-xs font-semibold">StorageViewr</p>
              <h2 className="mb-1 wrap-break-word text-2xl">{label.code}</h2>
              <p className="mb-3 wrap-break-word text-xs">
                {label.warehouseName}
              </p>
              <Image
                src={label.image}
                alt={"QR-kod för " + label.code}
                width={216}
                height={216}
                unoptimized
                className="h-auto w-48 max-w-full"
              />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Inga etiketter att skriva ut"
          action={
            <Link className="button-secondary" href="/locations">
              Visa lagerplatser
            </Link>
          }
        >
          Etiketter visas här när det finns aktiva lagerplatser i ett aktivt
          lager.
        </EmptyState>
      )}
    </AppShell>
  );
}
