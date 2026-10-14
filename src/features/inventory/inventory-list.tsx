import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import type { listInventories } from "./session-queries";

export function InventoryList({
  result,
  completed = false,
  admin = false,
}: {
  result: Awaited<ReturnType<typeof listInventories>>;
  completed?: boolean;
  admin?: boolean;
}) {
  const basePath = completed ? "/inventories/completed" : "/inventories";
  return <>
    {result.items.length ? <ol className="inventory-card-list">
      {result.items.map(item => <li key={item.id}>
        <Link href={"/inventories/" + item.id} className="inventory-card">
          <span className={"inventory-card-marker" + (completed ? " is-completed" : "")}>
            <AppIcon name={completed ? "verified" : "inventory"} width={23} height={23} />
          </span>
          <div className="inventory-card-identity">
            <div className="inventory-card-heading">
              <h2>{item.name}</h2>
              <span className={"inventory-card-status" + (completed ? " is-completed" : "")}>
                {completed ? "Genomförd" : "Pågående"}
              </span>
            </div>
            <p className="inventory-card-warehouse">{item.warehouseName}</p>
            <div className="inventory-card-meta">
              <span>{item.counted} av {item.total} {item.total === 1 ? "plats" : "platser"}</span>
              {(!completed || item.completedAt) && <time dateTime={(completed ? item.completedAt : item.startedAt) ?? item.startedAt}>
                {completed ? "Avslutad " : "Startad "}
                {new Date((completed ? item.completedAt : item.startedAt) ?? item.startedAt)
                  .toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm", day: "numeric", month: "short", year: "numeric" })}
              </time>}
            </div>
            {!completed && <progress value={item.counted} max={item.total || 1}
              aria-label={"Räknade platser i " + item.name} className="inventory-card-progress" />}
          </div>
          <AppIcon name="chevron" width={16} height={16} className="inventory-card-arrow" />
          <span className="sr-only">{completed ? "Visa inventering och rapport" : "Fortsätt inventering"}</span>
        </Link>
      </li>)}
    </ol> : <div className="inventory-list-empty">
      <span className="inventory-empty-marker"><AppIcon name={completed ? "history" : "inventory"} width={23} height={23} /></span>
      <div>
        <h2>{completed ? "Inga genomförda inventeringar" : "Inga pågående inventeringar"}</h2>
        <p>{completed ? "Avslutade inventeringar och rapporter visas här." : admin
          ? "Starta en inventering och välj platser att räkna."
          : "Inventeringar visas här när en administratör har startat dem."}</p>
      </div>
    </div>}
    {result.pages > 1 && <nav aria-label="Inventeringssidor" className="product-pagination">
      {result.page > 1 ? <Link className="product-page-control product-page-prev" href={basePath + "?page=" + (result.page - 1)}>
        <AppIcon name="chevron" width={15} height={15} /> Föregående
      </Link> : <span />}
      <span className="product-page-position">Sida {result.page} av {result.pages}</span>
      {result.page < result.pages ? <Link className="product-page-control product-page-next" href={basePath + "?page=" + (result.page + 1)}>
        Nästa <AppIcon name="chevron" width={15} height={15} />
      </Link> : <span />}
    </nav>}
  </>;
}
