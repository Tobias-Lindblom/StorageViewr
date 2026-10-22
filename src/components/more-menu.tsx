"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";
import { AppIcon } from "./app-icon";
import { BottomSheet } from "./bottom-sheet";

const destinations = [
  { href: "/dashboard", label: "Översikt", description: "Lagerhälsa och senaste aktivitet", icon: "dashboard" },
  { href: "/warehouses", label: "Lager", description: "Dina lager och lagerplatser", icon: "warehouse" },
  { href: "/inventories", label: "Inventering", description: "Pågående och genomförda inventeringar", icon: "inventory" },
  { href: "/reports", label: "Rapporter & dokument", description: "Lagervärde och inventeringsunderlag", icon: "document" },
  { href: "/discrepancies", label: "Avvikelser", description: "Granska öppna inventeringsavvikelser", icon: "alert" },
] as const;

export function MoreMenu({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [panel, setPanel] = useState({ pathname, open: false });
  if (panel.pathname !== pathname) setPanel({ pathname, open: false });
  const open = panel.pathname === pathname && panel.open;
  const current = destinations.find(item => pathname === item.href || pathname.startsWith(item.href + "/"));
  const active = open || (!!current && (admin || pathname !== "/inventories/completed"));

  function close() {
    setPanel({ pathname, open: false });
    requestAnimationFrame(() => trigger.current?.focus());
  }

  return <>
    <button type="button" ref={trigger} className={"mobile-nav-item w-full " + (active ? "is-active" : "")}
      aria-label="Mer" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => setPanel({ pathname, open: true })}>
      <span className="nav-icon"><AppIcon name="more" width={20} height={20} strokeWidth={3} /></span>
      <span>Mer</span>
    </button>
    {open && <BottomSheet id={id} title="Mer" variant="navigation" onClose={close}>
      <nav aria-label="Fler lagerfunktioner" className="more-navigation">
        {destinations.filter(item => admin || item.href !== "/discrepancies").map(item => {
          const selected = current?.href === item.href;
          return <Link key={item.href} href={item.href} className="more-navigation-row"
            aria-current={selected ? "page" : undefined} onClick={() => setPanel({ pathname, open: false })}>
            <span className="more-navigation-icon"><AppIcon name={item.icon} width={22} height={22} /></span>
            <span className="more-navigation-text"><span>{item.label}</span><span>{item.description}</span></span>
            <AppIcon name="chevron" width={16} height={16} className="more-navigation-arrow" />
          </Link>;
        })}
      </nav>
    </BottomSheet>}
  </>;
}
