import type { getDashboard } from "./service";
import { AppIcon } from "@/components/app-icon";

export function DashboardInsights({ dashboard }: { dashboard: Awaited<ReturnType<typeof getDashboard>> }) {
  const { health, pendingDiscrepancies } = dashboard.insights;
  const percentage = dashboard.productCount ? Math.round(health.verifiedProducts / dashboard.productCount * 100) : null;
  const progress = Math.min(100, Math.max(0, percentage ?? 0));
  const circumference = 2 * Math.PI * 42;
  const metrics = [
    { count: dashboard.productCount, text: "produkter", icon: "product" as const, tone: "success" },
    { count: health.verifiedProducts, text: "verifierade (≤30 dagar)", icon: "verified" as const, tone: "success" },
    { count: health.needsCountingProducts, text: "behöver räknas", icon: "alert" as const, tone: "warning" },
    { count: health.oldProducts, text: "ej räknade (>90 dagar)", icon: "alert" as const, tone: "danger" },
    { count: pendingDiscrepancies, text: "öppna avvikelser", icon: "alert" as const, tone: "danger" },
  ];
  return (
    <section className="dashboard-health dashboard-card" aria-labelledby="warehouse-health-heading">
      <h2 id="warehouse-health-heading">Lagerhälsa</h2>
      <div className="health-content">
        <div className="health-gauge">
          <div className="health-ring" role="progressbar" aria-label="Produkter med verifierat saldo senaste 30 dagarna"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage === null ? undefined : progress}
            aria-valuetext={percentage === null ? "Inga produkter att bedöma" : progress + " procent"}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="42" className="health-ring-track" />
              <circle cx="50" cy="50" r="42" className="health-ring-value"
                strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress / 100)} />
            </svg>
            <strong>{percentage === null ? "—" : progress + "%"}</strong>
          </div>
        </div>
        <ul className="health-metrics">
          {metrics.map(metric => (
            <li key={metric.text} title={metric.text === "öppna avvikelser" ? "Avvikande räkningar i pågående inventeringar" : undefined}>
              <AppIcon name={metric.icon} width={13} height={13} className={"metric-" + metric.tone} />
              <span><strong>{metric.count.toLocaleString("sv-SE")}</strong> {metric.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
