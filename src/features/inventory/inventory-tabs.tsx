import Link from "next/link";

export function InventoryTabs({ active }: { active: "active" | "completed" }) {
  return (
    <nav
      aria-label="Inventeringsstatus"
      className="mb-6 grid grid-cols-2 rounded-xl border border-line bg-surface p-1"
    >
      {[
        ["active", "Pågående", "/inventories"],
        ["completed", "Genomförda", "/inventories/completed"],
      ].map(([value, label, href]) => (
        <Link
          key={value}
          href={href}
          aria-current={active === value ? "page" : undefined}
          className={
            "flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-medium transition " +
            (active === value
              ? "bg-violet-500/15 text-accent ring-1 ring-inset ring-violet-400/25"
              : "text-muted hover:bg-surface-raised hover:text-foreground")
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
