"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon } from "./app-icon";

export function AppNav() {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", label: "Översikt", icon: "dashboard" as const },
    { href: "/warehouses", label: "Lager", icon: "warehouse" as const },
    { href: "/locations", label: "Lagerplatser", icon: "location" as const },
    { href: "/products", label: "Produkter", icon: "product" as const },
  ];
  return (
    <nav
      aria-label="Företagsmeny"
      className="grid grid-cols-4 gap-1 rounded-2xl border border-line/70 bg-surface p-1.5 lg:sticky lg:top-6 lg:grid-cols-1 lg:gap-2 lg:p-3"
    >
      {items.map((item) => {
        const active =
          pathname === item.href ||
          pathname.startsWith(item.href + "/") ||
          (item.icon === "location" && pathname.startsWith("/location/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-3 text-[10px] font-medium transition min-[380px]:text-xs lg:min-h-13 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm ${active ? "bg-violet-500/15 text-accent ring-1 ring-inset ring-violet-400/30" : "text-muted hover:bg-surface-raised hover:text-foreground"}`}
          >
            <AppIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
