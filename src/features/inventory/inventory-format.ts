export const formatInventoryNumber = (value: number) =>
  value.toLocaleString("sv-SE");

export const formatInventoryDate = (value: string) =>
  new Date(value).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Stockholm",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const inventoryDiscrepancyKey = (
  productId: string,
  locationId: string,
) => `${productId}:${locationId}`;
