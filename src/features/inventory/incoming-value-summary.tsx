import { formatSek } from "@/lib/money";
import type { InventoryDetail } from "./session-queries";

export function IncomingValueSummary({ data }: { data: InventoryDetail }) {
  const summary = data.incomingValueSummary;
  if (!summary) return null;

  return (
    <section className="incoming-value-summary" aria-labelledby="incoming-value-summary-heading">
      <header>
        <h2 id="incoming-value-summary-heading">Inkommande varuvärde</h2>
        <p>Manuellt angivna värden som sparades när inventeringen slutfördes.</p>
      </header>
      <dl>
        <div>
          <dt>Inventerat lagervärde</dt>
          <dd>{formatSek(BigInt(summary.inventoryValueUnits))}</dd>
        </div>
        <div>
          <dt>Inkommande</dt>
          <dd>{formatSek(BigInt(summary.incomingValueUnits))}</dd>
        </div>
        <div>
          <dt>Totalt varuvärde</dt>
          <dd>{formatSek(BigInt(summary.totalGoodsValueUnits))}</dd>
        </div>
      </dl>
      <details>
        <summary>Visa poster ({summary.entries.length})</summary>
        <ul>
          {summary.entries.map((entry, index) => (
            <li key={entry.label + ":" + entry.amountUnits + ":" + index}>
              <span>{entry.label}</span>
              <strong>{formatSek(BigInt(entry.amountUnits))}</strong>
            </li>
          ))}
        </ul>
      </details>
      {summary.productsWithoutValue > 0 && (
        <p className="incoming-value-summary-note">
          {summary.productsWithoutValue.toLocaleString("sv-SE")} {summary.productsWithoutValue === 1 ? "produkt saknar" : "produkter saknar"} styckvärde. Det inventerade lagervärdet och totalsumman är därför ofullständiga.
        </p>
      )}
    </section>
  );
}
