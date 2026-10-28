export function movementLabel(type: string) {
  const labels: Record<string, string> = {
    RECEIPT: "Inleverans", TRANSFER: "Flytt", CORRECTION: "Korrigering", INVENTORY: "Inventering",
  };
  return labels[type] ?? "Saldoändring";
}
