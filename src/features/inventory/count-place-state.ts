import type { InventoryPlace } from "./session-queries";

export type CountRow = {
  productId: string;
  productName: string;
  sku: string;
  currentQuantity: number;
  currentVersion: number | null;
  value: string;
};

export type ProductChoice = { id: string; name: string; sku: string };

export function createCountRows(place: InventoryPlace): CountRow[] {
  return place.rows.map((row) => ({
    ...row,
    value: row.countedQuantity === null ? "" : String(row.countedQuantity),
  }));
}

export function mergeRefreshedCountRows(
  current: CountRow[],
  latest: InventoryPlace,
) {
  const existing = new Map(current.map((row) => [row.productId, row]));
  const refreshed = latest.rows.map((row) => ({
    ...row,
    value:
      existing.get(row.productId)?.value ??
      (row.countedQuantity === null ? "" : String(row.countedQuantity)),
  }));
  return [
    ...refreshed,
    ...current.filter(
      (row) => !latest.rows.some((item) => item.productId === row.productId),
    ),
  ];
}
