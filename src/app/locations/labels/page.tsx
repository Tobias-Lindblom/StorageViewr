import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
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
        <PageHeading
          eyebrow="Lagerplatser"
          title="QR-etiketter"
          description={labels.length + " etiketter för aktiva platser."}
          action={labels.length ? <PrintButton /> : undefined}
        />
        <p className="mb-6 wrap-break-word text-sm leading-6 text-muted">
          Etiketterna länkar till {origin}.
          {local &&
            " För skanning på en annan enhet behöver APP_URL vara en adress som den enheten kan nå."}
        </p>
      </div>
      {labels.length ? (
        <div className="label-sheet grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {labels.map((label) => (
            <article
              key={label.id}
              className="qr-label flex flex-col items-center rounded-2xl border border-line bg-white p-5 text-center text-black"
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
                className="h-auto max-w-full"
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
