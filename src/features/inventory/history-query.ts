export const historyMovementTypes = {
  all: ["RECEIPT", "INVENTORY", "CORRECTION"],
  receipt: ["RECEIPT"],
  inventory: ["INVENTORY"],
  correction: ["CORRECTION"],
} as const;
export function historySearch(q: string, prefix = "") {
  const regex = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return ["productName", "sku", "locationCode", "warehouseName", "reason", "performedByName"]
    .map(field => ({ [prefix + field]: { $regex: regex, $options: "i" } }));
}
