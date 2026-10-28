"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";
import { AppIcon } from "./app-icon";
import { BottomSheet } from "./bottom-sheet";
import { MobileNavIcon } from "./mobile-nav-icon";

export function MoreMenu({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const history = admin ? "/inventory/history" : "/inventories/completed";
  const destinations = [
    { href: history, label: "Historik", description: admin ? "Alla lagerhändelser och förändringar" : "Genomförda inventeringar", icon: "history" as const },
    { href: "/inventories", label: "Inventering", description: "Pågående och genomförda inventeringar", icon: "inventory" as const },
    { href: "/warehouses", label: "Lager", description: "Dina lager och lagerplatser", icon: "warehouse" as const },
    { href: "/reports", label: "Rapporter & dokument", description: "Lagervärde och inventeringsunderlag", icon: "document" as const },
    { href: "/discrepancies", label: "Avvikelser", description: "Granska öppna inventeringsavvikelser", icon: "alert" as const },
  ];
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [panel, setPanel] = useState({ pathname, open: false });
  if (panel.pathname !== pathname) setPanel({ pathname, open: false });
  const open = panel.pathname === pathname && panel.open;
  const current = destinations.find(item => pathname === item.href || pathname.startsWith(item.href + "/"));
  const active = open || !!current;

  function close() {
    setPanel({ pathname, open: false });
    requestAnimationFrame(() => trigger.current?.focus());
  }

  return <>
    <button type="button" ref={trigger} className={"mobile-nav-item w-full " + (active ? "is-active" : "")}
      aria-label="Mer" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => setPanel({ pathname, open: true })}>
      <span className="nav-icon"><MobileNavIcon name="more" size={20} /></span>
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
