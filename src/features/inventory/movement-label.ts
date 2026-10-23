export function movementLabel(type: string) {
  const labels: Record<string, string> = {
    RECEIPT: "Inleverans", CORRECTION: "Korrigering", INVENTORY: "Inventering",
  };
  return labels[type] ?? "Saldoändring";
}
