export function movementLabel(type: string) {
  const labels: Record<string, string> = {
    INITIAL: "Första placering", ADJUSTMENT: "Saldoändring", RECEIPT: "Inleverans",
    ISSUE: "Uttag", TRANSFER_OUT: "Flytt från plats", TRANSFER_IN: "Flytt till plats",
    CORRECTION: "Korrigering", INVENTORY: "Inventering",
  };
  return labels[type] ?? "Saldoändring";
}
