import { AppIcon } from "./app-icon";

export function StockSummary({ total, count, kind }: {
  total: string; count: number; kind: "product" | "location";
}) {
  return <dl className="grid grid-cols-2 gap-3">
    <div className="stock-card gap-1! p-3! sm:p-5!">
      <dt className="flex items-center gap-2 text-xs text-muted"><AppIcon name="product" width={17} height={17} className="text-accent" />{kind === "product" ? "Totalt saldo" : "Enheter totalt"}</dt>
      <dd className={"min-w-0 wrap-break-word text-xl font-semibold tabular-nums sm:text-2xl " + (total === "0" ? "text-destructive" : "")}>
        {BigInt(total).toLocaleString("sv-SE")} <span className="text-xs font-normal text-muted">st</span>
      </dd>
    </div>
    <div className="stock-card gap-1! p-3! sm:p-5!">
      <dt className="flex items-center gap-2 text-xs text-muted"><AppIcon name={kind === "product" ? "location" : "product"} width={17} height={17} className="text-accent" />{kind === "product" ? "Lagerplatser" : "Produkter"}</dt>
      <dd className="text-xl font-semibold tabular-nums sm:text-2xl">{count}</dd>
    </div>
  </dl>;
}
