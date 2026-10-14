import type { ReactNode } from "react";
import { InventoryList } from "./inventory-list";
import { InventoryTabs } from "./inventory-tabs";
import type { listInventories } from "./session-queries";

export function InventoryOverview({ result, completed = false, admin = false, action }: {
  result: Awaited<ReturnType<typeof listInventories>>;
  completed?: boolean;
  admin?: boolean;
  action?: ReactNode;
}) {
  return <section className="product-overview inventory-overview" aria-labelledby="inventory-heading">
    <h1 id="inventory-heading">Inventering</h1>
    <InventoryTabs active={completed ? "completed" : "active"} />
    {action && <div className="inventory-list-toolbar">{action}</div>}
    <InventoryList result={result} completed={completed} admin={admin} />
  </section>;
}
