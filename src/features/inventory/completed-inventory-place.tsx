import { AppIcon } from "@/components/app-icon";
import type { InventoryPlace } from "./session-queries";
import { formatInventoryNumber as number } from "./inventory-format";

export function CompletedInventoryPlace({
  place,
  establishesBaseline,
}: {
  place: InventoryPlace;
  establishesBaseline: boolean;
}) {
  return (
    <details className="inventory-place-details">
      <summary className="inventory-place-row">
        <span className="inventory-place-marker is-counted">
          <AppIcon name="verified" width={25} height={25} />
        </span>
        <span className="inventory-place-identity">
          <span>{place.code}</span>
          <span>
            {place.rows.length} {place.rows.length === 1 ? "produkt" : "produkter"}
            {place.completedByName && " · " + place.completedByName}
          </span>
        </span>
        <span className="inventory-place-badge is-counted">Räknad</span>
        <AppIcon name="chevron" width={15} height={15} className="inventory-place-arrow" />
        <span className="sr-only">Visa räknade produkter</span>
      </summary>
      <div className="inventory-place-results">
        {place.rows.length ? (
          <ul>
            {place.rows.map((item) => {
              const isBaseline = establishesBaseline && item.expectedQuantity === 0;
              const difference = item.difference ?? 0;
              return (
                <li key={item.productId} className="inventory-result">
                  <p>{item.productName}</p>
                  <span>SKU {item.sku}</span>
                  <dl>
                    <div><dt>Förväntat</dt><dd>{number(item.expectedQuantity)}</dd></div>
                    <div><dt>Räknat</dt><dd>{number(item.countedQuantity ?? 0)}</dd></div>
                    <div>
                      <dt>{isBaseline ? "Startsaldo" : "Avvikelse"}</dt>
                      <dd className={isBaseline ? "" : difference < 0 ? "is-negative" : difference > 0 ? "is-positive" : ""}>
                        {isBaseline ? number(item.countedQuantity ?? 0) : <>{difference > 0 ? "+" : ""}{number(difference)}</>}
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>Platsen bekräftades som tom.</p>
        )}
      </div>
    </details>
  );
}
