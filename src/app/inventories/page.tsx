import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { MaterialArrow } from "@/components/material-arrow";
import { pageTenant } from "@/lib/server/page-auth";
import { pageResource } from "@/lib/server/page-resource";
import { listInventories } from "@/features/inventory/session-queries";
import { StartInventory } from "@/features/inventory/start-inventory";
import { listWarehouses } from "@/features/warehouses/service";
import { listLocations } from "@/features/locations/service";

export default async function InventoriesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const context = await pageTenant();
  const admin = context.role === "admin";
  const query = await searchParams;
  const [result, warehouses, locations] = await Promise.all([
    pageResource(() => listInventories(context, query.page ?? 1)),
    admin ? listWarehouses({ ...context, role: "warehouse" }) : Promise.resolve([]),
    admin ? listLocations({ ...context, role: "warehouse" }) : Promise.resolve([]),
  ]);
  return <AppShell context={context}>
    <PageHeading title="Inventering" description="Räkna på plats. Granska avvikelser. Uppdatera lagret."
      action={admin ? <StartInventory warehouses={warehouses} locations={locations} /> : undefined} />
    {result.items.length ? <div className="grid gap-4 sm:grid-cols-2">{result.items.map(item => <Link key={item.id} href={"/inventories/" + item.id} className="panel block transition hover:border-accent/60">
      <div className="flex items-start justify-between gap-3"><h2 className="mb-0! break-words text-lg!">{item.name}</h2><MaterialArrow className="shrink-0 text-accent" /></div>
      <p className="mt-2 text-sm text-muted">{item.warehouseName}</p>
      <div className="mt-6 flex flex-wrap justify-between gap-2 text-xs"><span className="text-cyan">{item.status === "completed" ? "Avslutad" : "Pågående"}</span><span>{item.counted} av {item.total} platser</span></div>
      <progress aria-label="Räknade platser" value={item.counted} max={item.total || 1} className="mt-3 h-1.5 w-full accent-violet-500" />
    </Link>)}</div> : <div className="panel"><h2>Redo att räkna?</h2><p className="text-sm leading-7 text-muted">{admin ? "Starta en inventering och välj vilka lagerplatser som ska räknas." : "Här visas inventeringar när en administratör startar dem."}</p></div>}
    {result.pages > 1 && <nav aria-label="Inventeringssidor" className="mt-6 flex items-center justify-between gap-3">
      {result.page > 1 ? <Link className="button-secondary" href={"?page=" + (result.page - 1)}>Föregående</Link> : <span />}
      <span className="text-xs text-muted">{result.page} / {result.pages}</span>
      {result.page < result.pages && <Link className="button-secondary" href={"?page=" + (result.page + 1)}>Nästa</Link>}
    </nav>}
  </AppShell>;
}
