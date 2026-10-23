import Link from "next/link";
import type { ReactNode } from "react";
import type { getDashboard } from "./service";
import type { listLocations } from "@/features/locations/service";
import { AppIcon } from "@/components/app-icon";
import { DashboardInsights } from "./dashboard-insights";
import { DashboardActions } from "./dashboard-actions";
import { RecentActivity } from "./recent-activity";
import { StartInventory } from "@/features/inventory/start-inventory";
import { formatSek } from "@/lib/money";

const SECONDS_PER_LOCATION = 30;
const SECONDS_PER_POSITION = 15;

function compactSek(units: string) {
  return formatSek(BigInt(units)).replace(",00\u00a0kr", "\u00a0kr");
}

export function DashboardView({ dashboard, locations, warehouses, admin, accountName }: {
  dashboard: Awaited<ReturnType<typeof getDashboard>>;
  locations: Awaited<ReturnType<typeof listLocations>>;
  warehouses: { id: string; name: string }[];
  admin: boolean;
  accountName: string;
}) {
  const active = dashboard.activeInventories[0];
  const warehouseId = dashboard.insights.suggestedLocations[0]?.warehouseId;
  const suggested = dashboard.insights.suggestedLocations.filter(place => place.warehouseId === warehouseId);
  const suggestedIds = new Set(suggested.map(place => place.id));
  const selected = locations.filter(place => suggestedIds.has(place.id));
  const selectedIds = selected.map(place => place.id);
  const positionsToCount = dashboard.insights.focus.positions;
  const productsToCount = dashboard.insights.focus.products;
  const minutes = Math.max(1, Math.ceil((selected.length * SECONDS_PER_LOCATION + positionsToCount * SECONDS_PER_POSITION) / 60));
  const noWarehouse = dashboard.warehouseCount === 0;
  const noLocation = dashboard.locationCount === 0;
  const unplaced = dashboard.insights.health.productsWithoutInventory;
  const title = noWarehouse ? "Skapa ditt första lager" : noLocation ? "Skapa dina lagerplatser" :
    active ? active.counted >= active.total ? "Granska inventeringen" : "Inventera " + (active.total - active.counted) + " platser" :
    selected.length ? "Inventera " + selected.length + (selected.length === 1 ? " plats" : " platser") :
    unplaced ? "Placera " + unplaced + (unplaced === 1 ? " produkt" : " produkter") : "Lagret är nyligen inventerat";
  const description = noWarehouse ? "Kom igång med fysisk lagerkontroll" : noLocation ? "Gör produkternas placering tydlig" :
    active ? active.counted + " av " + active.total + " platser räknade" :
    selected.length ? "~" + minutes + " minuter · " + productsToCount.toLocaleString("sv-SE") + " produkter" :
    unplaced ? "Koppla produkterna till rätt fysisk lagerplats" : "Alla lagerpositioner är spårbara";
  const focusReasons = [
    [dashboard.insights.focus.openDiscrepancies, "öppna avvikelser"],
    [dashboard.insights.focus.neverCounted, "aldrig räknade"],
    [dashboard.insights.focus.stale, "gamla kontroller"],
    [dashboard.insights.focus.needsVerification, "behöver verifieras"],
    [dashboard.insights.focus.dueSoon, "behöver snart verifieras"],
  ].filter(row => Number(row[0]) > 0).slice(0, 3);
  const choices = locations.map(place => ({ id: place.id, label: place.warehouseName + " · " + place.code }));
  const firstName = accountName.trim().split(/\s+/)[0] ?? "";
  const focusLabel: ReactNode = <>
    <span className="dashboard-focus-icon"><AppIcon name="layers" width={29} height={29} /></span>
    <span className="dashboard-focus-copy"><strong>{title}</strong><span>{description}</span>
      {!active && selected.length > 0 && focusReasons.length > 0 && <small>{focusReasons.map(row => row[0] + " " + row[1]).join(" · ")}</small>}
    </span>
    <AppIcon name="chevron" width={18} height={18} className="dashboard-focus-arrow" />
  </>;
  const focusAction = active
    ? <Link className="dashboard-focus-action" href={"/inventories/" + active.id}>{focusLabel}</Link>
    : noWarehouse
      ? <Link className="dashboard-focus-action" href={admin ? "/warehouses/new" : "/warehouses"}>{focusLabel}</Link>
      : noLocation
        ? <Link className="dashboard-focus-action" href={admin ? "/locations/new" : "/locations"}>{focusLabel}</Link>
        : selected.length && admin
          ? <StartInventory warehouses={warehouses}
              locations={locations.map(place => ({ id: place.id, warehouseId: place.warehouseId, code: place.code }))}
              initialWarehouseId={warehouseId} initialLocationIds={selectedIds}
              label={focusLabel} defaultName="Dagens inventering" className="dashboard-focus-action" />
          : <Link className="dashboard-focus-action" href={selected.length ? "/locations" : unplaced ? "/products" : "/inventories"}>{focusLabel}</Link>;
  const overview = [
    { href: "/products", value: dashboard.productCount.toLocaleString("sv-SE"), label: "Produkter", icon: "product" as const, tone: "cyan" },
    { href: "/locations", value: dashboard.locationCount.toLocaleString("sv-SE"), label: "Lagerplatser", icon: "location" as const, tone: "blue" },
    { href: "/products", value: BigInt(dashboard.stockUnitCount).toLocaleString("sv-SE"), label: "Registrerat antal", icon: "units" as const, tone: "blue" },
    { href: "/reports", value: compactSek(dashboard.inventoryValueUnits), label: "Lagervärde", icon: "coins" as const, tone: "neutral",
      note: dashboard.productsWithoutValue ? dashboard.productsWithoutValue + " saknar styckvärde" : undefined },
  ];
  return (
    <div className="warehouse-dashboard">
      <header className="dashboard-welcome"><h1>God morgon{firstName ? ", " + firstName : ""}</h1><p>Här är läget i ditt lager</p></header>
      <div className="dashboard-layout">
        <DashboardInsights dashboard={dashboard} />
        <section className="dashboard-focus dashboard-card" aria-labelledby="daily-focus-heading">
          <div className="dashboard-card-heading">
            <h2 id="daily-focus-heading"><AppIcon name="target" width={21} height={21} />Dagens fokus</h2>
          </div>
          {focusAction}
        </section>
        <DashboardActions locations={choices} admin={admin} />
        <section className="dashboard-overview" aria-labelledby="warehouse-overview-heading">
          <div className="dashboard-section-heading">
            <h2 id="warehouse-overview-heading"><AppIcon name="chart" width={20} height={20} />Lageröversikt</h2>
          </div>
          <div className="dashboard-overview-grid dashboard-overview-block">
            {overview.map(item => <Link key={item.label} href={item.href} className="dashboard-overview-card">
              <span className={"dashboard-overview-icon is-" + item.tone}><AppIcon name={item.icon} width={23} height={23} /></span>
              <span><strong>{item.value}</strong><small>{item.label}</small>{item.note && <small className="text-warning">{item.note}</small>}</span>
            </Link>)}
          </div>
        </section>
        <RecentActivity items={dashboard.activity} admin={admin} overview />
      </div>
    </div>
  );
}
