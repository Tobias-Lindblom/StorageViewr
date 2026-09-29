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
    { href: "/inventories", label: "Inventering", icon: "inventory" as const },
  ];
  return (
    <nav
      aria-label="Företagsmeny"
      className="grid grid-cols-5 gap-0 rounded-[1.25rem] border border-line/55 bg-surface/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_10px_28px_rgba(0,0,0,0.16)] backdrop-blur-xl lg:sticky lg:top-6 lg:grid-cols-1 lg:gap-2 lg:p-3"
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
            className={`group relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 overflow-visible rounded-2xl px-1 py-2 text-[10px] leading-none transition min-[440px]:text-xs lg:min-h-13 lg:flex-row lg:justify-start lg:gap-3 lg:overflow-hidden lg:rounded-xl lg:px-3 lg:text-sm ${active ? "font-medium text-accent lg:bg-violet-500/15 lg:ring-1 lg:ring-inset lg:ring-violet-400/25" : "font-medium text-muted hover:bg-white/[0.025] hover:text-foreground lg:hover:bg-surface-raised/70"}`}
          >
            {active && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-b from-violet-400/10 via-violet-400/[0.025] to-transparent lg:hidden"
              />
            )}
            <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center">
              <AppIcon
                name={item.icon}
                strokeWidth={active ? 1.8 : 1.5}
              />
            </span>
            <span className="relative z-10 truncate">{item.label}</span>
            {active && (
              <span
                aria-hidden="true"
                className="absolute -top-1 left-1/2 z-20 h-0.5 w-7 -translate-x-1/2 rounded-b-full bg-accent shadow-[0_2px_10px_rgba(189,165,255,0.4)] lg:hidden"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
