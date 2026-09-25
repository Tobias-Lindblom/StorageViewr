import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { MaterialArrow } from "@/components/material-arrow";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { listMovements } from "@/features/inventory/service";
import { historyQuerySchema } from "@/validation/inventory";

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
        Tillbaka
      </Link>
      <PageHeading
        title="Saldohistorik"
        description="Varje ändring, med antal, orsak och vem som registrerade den."
      />
      {result.items.length ? (
        <ol className="space-y-4">
          {result.items.map((item) => (
            <li key={item.id} className="panel p-5!">
              <div className="flex flex-wrap items-start justify-between gap-3">
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
                    "rounded-lg px-3 py-2 text-sm font-semibold tabular-nums " +
                    (item.difference < 0
                      ? "bg-rose-400/10 text-rose-200"
                      : "bg-cyan/10 text-cyan")
                  }
                >
                  {item.difference > 0 ? "+" : ""}
                  {item.difference.toLocaleString("sv-SE")} st
                </span>
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                {item.previousQuantity.toLocaleString("sv-SE")}{" "}
                <MaterialArrow /> {item.newQuantity.toLocaleString("sv-SE")} st
                <span className="text-xs text-muted">
                  ·{" "}
                  {item.type === "INITIAL"
                    ? "Första placering"
                    : item.type === "RECEIPT"
                      ? "Inleverans"
                      : item.type === "ISSUE"
                        ? "Uttag"
                        : item.type === "TRANSFER_OUT"
                          ? "Flytt från plats"
                          : item.type === "TRANSFER_IN"
                            ? "Flytt till plats"
                            : item.type === "CORRECTION"
                              ? "Korrigering"
                    : item.type === "INVENTORY"
                      ? "Inventering"
                      : "Saldoändring"}
                </span>
              </p>
              <p className="mt-3 wrap-break-word text-sm leading-7">
                {item.reason}
              </p>
              {item.inventorySessionId && (
                <Link
                  className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm text-cyan"
                  href={"/inventories/" + item.inventorySessionId}
                >
                  Visa inventering
                  <MaterialArrow />
                </Link>
              )}
              <p className="mt-3 text-xs leading-6 text-muted">
                {item.performedByName} ·{" "}
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString("sv-SE", {
                    timeZone: "Europe/Stockholm",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </p>
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
