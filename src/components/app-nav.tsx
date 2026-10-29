"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon } from "./app-icon";
import { MobileNavIcon, type MobileNavIconName } from "./mobile-nav-icon";
import { ScannerButton } from "@/features/scanner/scanner-button";
import {
  desktopNavigation,
  isNavigationDestinationActive,
  mobileNavigation,
} from "./app-navigation";

export function AppNav({ admin, mobile = false }: { admin: boolean; mobile?: boolean }) {
  const pathname = usePathname();
  const items = mobile ? mobileNavigation : desktopNavigation(admin);
  return <nav aria-label="Huvudnavigation" className={mobile ? "mobile-nav grid h-full grid-cols-4" : "desktop-nav"}>
    {items.map(item => {
      const active = isNavigationDestinationActive(pathname, item.href);
      const className = mobile ? "mobile-nav-item " + (active ? "is-active" : "") :
        "desktop-nav-item " +
        (active ? "is-active" : "");
      const content = <>
        <span className={mobile && item.icon === "scan" ? "nav-scanner" : "nav-icon"}>
          {mobile
            ? <MobileNavIcon name={item.icon as MobileNavIconName} size={item.icon === "scan" ? 26 : 20} />
            : <AppIcon name={item.icon} width={20} height={20} />}
        </span>
        <span className={mobile && item.icon === "scan" ? "sr-only" : "truncate"}>{item.label}</span>
      </>;
      return item.icon === "scan" ? <ScannerButton key={item.href} className={className}>{content}</ScannerButton> :
        <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={className}>{content}</Link>;
    })}
  </nav>;
}
