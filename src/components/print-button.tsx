import { AppIcon } from "./app-icon";

export function PrintButton({ warehouseId }: { warehouseId?: string }) {
  const query = warehouseId
    ? "?" + new URLSearchParams({ warehouseId })
    : "";
  return (
    <a
      className="button w-full gap-2! sm:w-auto"
      href={"/api/locations/labels" + query}
      target="_blank"
      rel="noopener"
    >
      <AppIcon name="document" width={18} height={18} />
      Skriv ut etiketter
    </a>
  );
}
