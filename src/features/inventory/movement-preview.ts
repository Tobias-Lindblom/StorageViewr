import type { MovementData } from "./service";

export function movementPreview(items: MovementData["items"]) {
  const seen = new Set<string>();
  return items.flatMap(item => {
    if (item.transferId) {
      if (seen.has(item.transferId)) return [];
      const outgoing = items.find(row => row.transferId === item.transferId && row.type === "TRANSFER_OUT");
      const incoming = items.find(row => row.transferId === item.transferId && row.type === "TRANSFER_IN");
      if (outgoing && incoming) {
        seen.add(item.transferId);
        return [{ ...item, type: "TRANSFER", difference: Math.abs(outgoing.difference),
          locationCode: outgoing.warehouseName === incoming.warehouseName
            ? outgoing.locationCode + " → " + incoming.locationCode
            : outgoing.warehouseName + " · " + outgoing.locationCode + " → " + incoming.warehouseName + " · " + incoming.locationCode }];
      }
    }
    return [item];
  });
}
