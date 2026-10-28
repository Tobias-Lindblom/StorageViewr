export const historyMovementTypes = {
  all: ["RECEIPT", "TRANSFER", "INVENTORY", "CORRECTION"],
  receipt: ["RECEIPT"],
  transfer: ["TRANSFER"],
  inventory: ["INVENTORY"],
  correction: ["CORRECTION"],
} as const;
export function historySearch(q: string, prefix = "") {
  const regex = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return ["productName", "sku", "locationCode", "warehouseName", "counterpartLocationCode", "counterpartWarehouseName", "reason", "performedByName"]
    .map(field => ({ [prefix + field]: { $regex: regex, $options: "i" } }));
}
