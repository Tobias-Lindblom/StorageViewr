import Link from "next/link";
import type { DashboardActivity } from "./activity";
import { AppIcon } from "@/components/app-icon";

function activityTime(date: string) {
  const value = new Date(date);
  return value.toLocaleDateString("sv-SE", { day: "numeric", month: "short", timeZone: "Europe/Stockholm" }).replace(/\./g, "") +
    ", " + value.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" });
}
export function RecentActivity({ items, admin, compactLocation = false, href, overview = false }: {
  items: DashboardActivity[];
  admin: boolean;
  compactLocation?: boolean;
  href?: string;
  overview?: boolean;
}) {
  return (
    <section className={"dashboard-activity " + (overview ? "dashboard-activity-overview" : "")} aria-labelledby="recent-activity-heading">
      <div className="dashboard-section-heading">
        <h2 id="recent-activity-heading">{overview && <AppIcon name="history" width={20} height={20} />}Senaste aktivitet</h2>
        <Link href={href ?? (admin ? "/inventory/history" : "/inventories/completed")}>Visa alla
          {overview && <AppIcon name="chevron" width={15} height={15} />}</Link>
      </div>
      {items.length ? <ol className="dashboard-activity-list">
        {items.map(item => (
          <li key={item.id}>
            <Link href={item.href} className="activity-row" aria-label={item.label + ", " + item.amount + ", " + item.locationCode + ", " + activityTime(item.createdAt)}>
              <strong className={"activity-amount metric-" + (item.amount === "INV" ? "inventory" : item.tone)} title={item.amount}>{item.amount}</strong>
              {overview ? <span className="activity-summary" title={item.label + " · " + item.locationCode}>{item.label}
                <span> · {item.locationCode}</span></span> : <>
                <span className="activity-name" title={item.label}>{item.label}</span>
                {!compactLocation && <span className="activity-location">{item.locationCode}</span>}
              </>}
              <time dateTime={item.createdAt}>{overview
                ? new Date(item.createdAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" })
                : activityTime(item.createdAt)}</time>
            </Link>
          </li>
        ))}
      </ol> : overview ? null : <div className="dashboard-activity-empty"><p>Ingen aktivitet registrerad ännu.</p><span>Inleveranser, flyttar, inventeringar och saldokorrigeringar visas här.</span></div>}
    </section>
  );
}
