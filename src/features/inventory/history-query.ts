export const historyMovementTypes = {
  receipt: ["RECEIPT", "INITIAL"],
  issue: ["ISSUE"],
  transfer: ["TRANSFER_OUT", "TRANSFER_IN"],
  inventory: ["INVENTORY"],
  correction: ["CORRECTION", "ADJUSTMENT"],
} as const;
export function historySearch(q: string, prefix = "") {
  const regex = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return ["productName", "sku", "locationCode", "warehouseName", "reason", "performedByName"]
    .map(field => ({ [prefix + field]: { $regex: regex, $options: "i" } }));
}
