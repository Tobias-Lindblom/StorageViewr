import Link from "next/link";
import type { getDashboard } from "./service";
import { AppIcon } from "@/components/app-icon";

export function DashboardInsights({ dashboard }: { dashboard: Awaited<ReturnType<typeof getDashboard>> }) {
  const { health, pendingDiscrepancies } = dashboard.insights;
  const percentage = dashboard.productCount ? Math.round(health.verifiedProducts / dashboard.productCount * 100) : null;
  const progress = Math.min(100, Math.max(0, percentage ?? 0));
  const attention = Math.max(0, dashboard.productCount - health.verifiedProducts);
  const metrics = [
    { count: dashboard.productCount, text: "Produkter", icon: "product" as const, tone: "success" },
    { count: pendingDiscrepancies, text: "Öppna avvikelser", icon: "alert" as const, tone: "danger" },
    { count: health.oldProducts, text: "Ej räknad > 90 dagar", icon: "history" as const, tone: "warning" },
  ];
  return (
    <section className="dashboard-health dashboard-card" aria-labelledby="warehouse-health-heading">
      <div className="dashboard-card-heading">
        <h2 id="warehouse-health-heading"><AppIcon name="heart" width={21} height={21} />Lagerhälsa</h2>
        <Link href="/inventories" aria-label="Visa inventeringar"><AppIcon name="chevron" width={17} height={17} /></Link>
      </div>
      <div className="health-primary">
        <div className="health-score-row">
          <div className="health-progress" role="progressbar" aria-label="Produkter med verifierat saldo senaste 30 dagarna"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage === null ? undefined : progress}
            aria-valuetext={percentage === null ? "Inga produkter att bedöma" : progress + " procent"}>
            <span style={{ width: progress + "%" }} />
          </div>
          <strong>{percentage === null ? "—" : progress + "%"}</strong>
        </div>
        <p>{health.verifiedProducts.toLocaleString("sv-SE")} av {dashboard.productCount.toLocaleString("sv-SE")} produkter verifierade</p>
        <p className="health-attention"><AppIcon name="alert" width={15} height={15} />
          {attention.toLocaleString("sv-SE")} behöver uppmärksamhet</p>
      </div>
      <ul className="health-metrics">
        {metrics.map(metric => (
          <li key={metric.text} title={metric.text === "Öppna avvikelser" ? "Avvikande räkningar i pågående inventeringar" : undefined}>
            <AppIcon name={metric.icon} width={22} height={22} className={"metric-" + metric.tone} />
            <span><strong>{metric.count.toLocaleString("sv-SE")}</strong><small>{metric.text}</small></span>
          </li>
        ))}
      </ul>
    </section>
  );
}
