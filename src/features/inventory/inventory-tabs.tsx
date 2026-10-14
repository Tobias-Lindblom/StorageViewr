import Link from "next/link";

export function InventoryTabs({ active }: { active: "active" | "completed" }) {
  return <nav aria-label="Inventeringsstatus" className="inventory-status-chips">
    {([
      ["active", "Pågående", "/inventories"],
      ["completed", "Genomförda", "/inventories/completed"],
    ] as const).map(([value, label, href]) => <Link key={value} href={href}
      aria-current={active === value ? "page" : undefined}
      className={"product-stock-chip" + (active === value ? " is-active" : "")}>
      {label}
    </Link>)}
  </nav>;
}
