import Link from "next/link";
import type { getDashboard } from "./service";
import type { listLocations } from "@/features/locations/service";
import { AppIcon } from "@/components/app-icon";
import { DashboardInsights } from "./dashboard-insights";
import { DashboardActions } from "./dashboard-actions";
import { RecentActivity } from "./recent-activity";
import { StartInventory } from "@/features/inventory/start-inventory";

export function DashboardView({ dashboard, locations, warehouses, admin }: {
  dashboard: Awaited<ReturnType<typeof getDashboard>>;
  locations: Awaited<ReturnType<typeof listLocations>>;
  warehouses: { id: string; name: string }[];
  admin: boolean;
}) {
  const active = dashboard.activeInventories[0];
  const warehouseId = dashboard.insights.suggestedLocations[0]?.warehouseId;
  const suggested = dashboard.insights.suggestedLocations.filter(place => place.warehouseId === warehouseId);
  const suggestedIds = new Set(suggested.map(place => place.id));
  const selected = locations.filter(place => suggestedIds.has(place.id));
  const selectedIds = selected.map(place => place.id);
  // A rough planning estimate: 30 seconds per place and 15 seconds per product.
  const minutes = Math.max(1, Math.ceil((selected.length * 30 + selected.reduce((sum, place) => sum + place.productCount * 15, 0)) / 60));
  const noWarehouse = dashboard.warehouseCount === 0;
  const noLocation = dashboard.locationCount === 0;
  const title = noWarehouse ? "Skapa ditt första lager" : noLocation ? "Skapa dina lagerplatser" :
    active ? active.counted >= active.total ? "Granska inventeringen" : "Inventera " + (active.total - active.counted) + " platser" :
    selected.length ? "Inventera " + selected.length + (selected.length === 1 ? " plats" : " platser") : "Lagret är nyligen inventerat";
  const description = noWarehouse ? "Kom igång med fysisk lagerkontroll" : noLocation ? "Gör produkternas placering tydlig" :
    active ? active.counted + " av " + active.total + " platser räknade" :
    selected.length ? "Beräknad tid: ca " + minutes + " min" : "Alla platser har räknats senaste 30 dagarna";
  const choices = locations.map(place => ({ id: place.id, label: place.warehouseName + " · " + place.code }));
  return (
    <div className="warehouse-dashboard">
      <header className="dashboard-welcome"><h1>God morgon</h1><p>Här är läget i ditt lager</p></header>
      <div className="dashboard-layout">
        <DashboardInsights dashboard={dashboard} />
        <section className="dashboard-suggestion" aria-labelledby="daily-suggestion-heading">
          <h2 id="daily-suggestion-heading">Dagens förslag</h2>
          <div className="dashboard-card suggestion-card">
            <span className="suggestion-icon"><AppIcon name="layers" width={26} height={26} /></span>
            <div className="suggestion-body">
              <h3>{title}</h3>
              <p title={selected.length && !active ? "Ungefärlig tidsåtgång utifrån antal platser och produkter." : undefined}>{description}</p>
              {active ? <Link className="dashboard-start" href={"/inventories/" + active.id}>Fortsätt inventering</Link> :
                noWarehouse ? <Link className="dashboard-start" href={admin ? "/warehouses/new" : "/warehouses"}>{admin ? "Skapa lager" : "Visa lager"}</Link> :
                noLocation ? <Link className="dashboard-start" href={admin ? "/locations/new" : "/locations"}>{admin ? "Skapa lagerplatser" : "Visa lagerplatser"}</Link> :
                selected.length && admin ? <StartInventory warehouses={warehouses}
                  locations={locations.map(place => ({ id: place.id, warehouseId: place.warehouseId, code: place.code }))}
                  initialWarehouseId={warehouseId} initialLocationIds={selectedIds}
                  label="Starta inventering" defaultName="Dagens inventering" className="dashboard-start" /> :
                <Link className="dashboard-start" href={selected.length ? "/locations" : "/inventories"}>{selected.length ? "Visa lagerplatser" : "Visa inventeringar"}</Link>}
            </div>
          </div>
        </section>
        <DashboardActions locations={choices} admin={admin} />
        <RecentActivity items={dashboard.activity} admin={admin} />
      </div>
    </div>
  );
}
