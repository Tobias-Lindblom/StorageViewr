import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { MaterialArrow } from "@/components/material-arrow";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { listMovements } from "@/features/inventory/service";
import { historyQuerySchema } from "@/validation/inventory";

function movementLabel(type: string) {
  switch (type) {
    case "INITIAL":
      return "Första placering";
    case "RECEIPT":
      return "Inleverans";
    case "ISSUE":
      return "Uttag";
    case "TRANSFER_OUT":
      return "Flytt från plats";
    case "TRANSFER_IN":
      return "Flytt till plats";
    case "CORRECTION":
      return "Korrigering";
    case "INVENTORY":
      return "Inventering";
    default:
      return "Saldoändring";
  }
}

export default async function StockHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await pageTenant();
  if (context.role !== "admin") notFound();
  const parsed = historyQuerySchema.safeParse(await searchParams);
  if (!parsed.success) notFound();
  const query = parsed.data;
  const result = await pageResource(() => listMovements(context, query));
  const back = query.productId
    ? "/products/" + query.productId
    : "/locations/" + query.locationId;
  const pageLink = (page: number) =>
    "/inventory/history?" +
    new URLSearchParams({
      ...(query.productId
        ? { productId: query.productId }
        : { locationId: query.locationId! }),
      page: String(page),
    });
  return (
    <AppShell context={context}>
      <Link
        href={back}
        className="mb-4 inline-flex min-h-13 items-center gap-2 text-sm text-accent"
      >
        <MaterialArrow name="back" />
        {query.productId ? "Till produkten" : "Till lagerplatsen"}
      </Link>
      <PageHeading
        title="Saldohistorik"
        description="Alla lagerhändelser med saldo, orsak och utförare."
      />
      {result.items.length ? (
        <ol className="overflow-hidden rounded-2xl border border-line bg-surface">
          {result.items.map((item) => (
            <li
              key={item.id}
              className="border-b border-line/60 p-5 last:border-0 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="wrap-break-word font-semibold">
                    {item.productName}
                  </p>
                  <p className="mt-1 wrap-break-word text-xs leading-6 text-muted">
                    {item.sku} · {item.warehouseName} · {item.locationCode}
                  </p>
                </div>
                <span
                  className={
                    "shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums " +
                    (item.difference < 0
                      ? "bg-rose-400/10 text-rose-200"
                      : "bg-cyan/10 text-cyan")
                  }
                >
                  {item.difference > 0 ? "+" : ""}
                  {item.difference.toLocaleString("sv-SE")} st
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <span className="font-medium text-accent">
                  {movementLabel(item.type)}
                </span>
                <span className="inline-flex items-center gap-2 tabular-nums">
                  {item.previousQuantity.toLocaleString("sv-SE")}
                  <MaterialArrow size={17} className="text-muted" />
                  {item.newQuantity.toLocaleString("sv-SE")} st
                </span>
              </div>
              <p className="mt-3 wrap-break-word text-sm leading-6">
                {item.reason}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs leading-6 text-muted">
                <p>
                  {item.performedByName}
                  <span aria-hidden="true"> · </span>
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString("sv-SE", {
                      timeZone: "Europe/Stockholm",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </p>
                {item.inventorySessionId && (
                  <Link
                    className="inline-flex min-h-9 items-center gap-2 text-sm text-cyan"
                    href={"/inventories/" + item.inventorySessionId}
                  >
                    Visa inventering
                    <MaterialArrow size={18} />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="panel text-sm text-muted">
          Inga saldoändringar har registrerats ännu.
        </p>
      )}
      {result.pages > 1 && (
        <nav
          aria-label="Historiksidor"
          className="mt-6 flex flex-wrap items-center justify-between gap-3"
        >
          {result.page > 1 ? (
            <Link className="button-secondary" href={pageLink(result.page - 1)}>
              Föregående
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted">
            Sida {result.page} av {result.pages}
          </span>
          {result.page < result.pages ? (
            <Link className="button-secondary" href={pageLink(result.page + 1)}>
              Nästa
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </AppShell>
  );
}
