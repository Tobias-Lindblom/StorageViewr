import type { AppIconName } from "./app-icon";
import type { MobileNavIconName } from "./mobile-nav-icon";

export type NavigationDestination = {
  href: string;
  label: string;
  icon: AppIconName;
  description?: string;
};

export const mobileNavigation: Array<
  Omit<NavigationDestination, "icon"> & { icon: MobileNavIconName }
> = [
  { href: "/dashboard", label: "Översikt", icon: "dashboard" },
  { href: "/products", label: "Produkter", icon: "product" },
  { href: "/scanner", label: "Skanna", icon: "scan" },
  { href: "/locations", label: "Lagerplatser", icon: "location" },
];

function historyDestination(admin: boolean): NavigationDestination {
  return admin
    ? {
        href: "/inventory/history",
        label: "Lagerhistorik",
        description: "Alla lagerhändelser och förändringar",
        icon: "history",
      }
    : {
        href: "/inventories/completed",
        label: "Genomförda inventeringar",
        description: "Signerade inventeringar och rapporter",
        icon: "history",
      };
}

export function desktopNavigation(admin: boolean): NavigationDestination[] {
  return [
    { href: "/dashboard", label: "Översikt", icon: "dashboard" },
    { href: "/products", label: "Produkter", icon: "product" },
    { href: "/locations", label: "Lagerplatser", icon: "location" },
    { href: "/inventories", label: "Inventering", icon: "inventory" },
    historyDestination(admin),
    { href: "/reports", label: "Rapporter", icon: "document" },
  ];
}

export function moreNavigation(admin: boolean): NavigationDestination[] {
  return [
    historyDestination(admin),
    {
      href: "/inventories",
      label: "Inventering",
      description: "Pågående och genomförda inventeringar",
      icon: "inventory",
    },
    {
      href: "/warehouses",
      label: "Lager",
      description: "Dina lager och lagerplatser",
      icon: "warehouse",
    },
    {
      href: "/reports",
      label: "Rapporter & dokument",
      description: "Lagervärde och inventeringsunderlag",
      icon: "document",
    },
    ...(admin
      ? [
          {
            href: "/discrepancies",
            label: "Avvikelser",
            description: "Granska öppna inventeringsavvikelser",
            icon: "alert" as const,
          },
        ]
      : []),
  ];
}

export function isNavigationDestinationActive(pathname: string, href: string) {
  return (
    pathname === href ||
    pathname.startsWith(href + "/") ||
    (href === "/locations" && pathname.startsWith("/location/"))
  );
}
