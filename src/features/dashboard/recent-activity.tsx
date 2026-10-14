import Link from "next/link";
import type { DashboardActivity } from "./activity";

function activityTime(date: string) {
  const value = new Date(date);
  return value.toLocaleDateString("sv-SE", { day: "numeric", month: "short", timeZone: "Europe/Stockholm" }).replace(/\./g, "") +
    ", " + value.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" });
}
export function RecentActivity({ items, admin, compactLocation = false, href }: { items: DashboardActivity[]; admin: boolean; compactLocation?: boolean; href?: string }) {
  return (
    <section className="dashboard-activity" aria-labelledby="recent-activity-heading">
      <div className="dashboard-section-heading">
        <h2 id="recent-activity-heading">Senaste aktivitet</h2>
        <Link href={href ?? (admin ? "/inventory/history" : "/inventories/completed")}>Visa alla</Link>
      </div>
      {items.length ? <ol className="dashboard-activity-list">
        {items.map(item => (
          <li key={item.id}>
            <Link href={item.href} className="activity-row" aria-label={item.label + ", " + item.amount + ", " + item.locationCode + ", " + activityTime(item.createdAt)}>
              <strong className={"activity-amount metric-" + (item.amount === "INV" ? "inventory" : item.tone)} title={item.amount}>{item.amount}</strong>
              <span className="activity-name" title={item.label}>{item.label}</span>
              {!compactLocation && <span className="activity-location">{item.locationCode}</span>}
              <time dateTime={item.createdAt}>{activityTime(item.createdAt)}</time>
            </Link>
          </li>
        ))}
      </ol> : <div className="dashboard-activity-empty"><p>Ingen aktivitet ännu</p><span>Lagerhändelser och inventeringar visas här.</span></div>}
    </section>
  );
}
