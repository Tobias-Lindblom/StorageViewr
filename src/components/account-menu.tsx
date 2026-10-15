"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { MaterialArrow } from "./material-arrow";
import { AppIcon } from "./app-icon";
import { LogoutButton } from "./logout-button";
import { AccountSettingsSheet } from "@/features/account/account-settings-sheet";
import { OrganizationSettingsSheet } from "@/features/organizations/organization-settings-sheet";
import type { OrganizationDocumentDetails } from "@/features/organizations/types";

export function AccountMenu({ account, organization }: {
  account: { name: string; email: string };
  organization?: OrganizationDocumentDetails & { name: string; slug: string; role: "admin" | "warehouse" };
}) {
  const [open, setOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<"account" | "organization" | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const initials = account.name.trim().split(/\s+/).slice(0, 2)
    .map(part => Array.from(part)[0] ?? "").join("").toLocaleUpperCase("sv");

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function closeSheet() {
    setActiveSheet(null);
    trigger.current?.focus();
  }

  return <>
    <div ref={container} className="relative shrink-0" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={trigger} type="button" aria-label="Företag och konto" aria-expanded={open} aria-controls={menuId}
        className="profile-menu-trigger" onClick={() => setOpen(value => !value)}>
        <span className="header-avatar" aria-hidden="true">{initials}</span>
      </button>
      <div id={menuId} hidden={!open} className="profile-menu">
        <section aria-label="Ditt konto">
          <div className="profile-menu-identity">
            <span className="header-avatar" aria-hidden="true">{initials}</span>
            <div className="profile-menu-text">
              <strong title={account.name}>{account.name}</strong>
              <span title={account.email}>{account.email}</span>
            </div>
          </div>
          <button type="button" className="profile-menu-row" aria-haspopup="dialog"
            onClick={() => { setOpen(false); setActiveSheet("account"); }}>
            <span className="profile-menu-icon"><AppIcon name="user" width={18} height={18} /></span>
            <span>Kontoinställningar</span><AppIcon name="chevron" width={15} height={15} className="profile-menu-arrow" />
          </button>
        </section>
        {organization && <section aria-label="Aktuellt företag" className="profile-menu-section">
          <p className="profile-menu-caption">Aktuellt företag</p>
          <div className="profile-menu-identity profile-menu-company">
            <span className="profile-menu-icon"><AppIcon name="warehouse" width={18} height={18} /></span>
            <div className="profile-menu-text">
              <strong title={organization.name}>{organization.name}</strong>
              <span>{organization.role === "admin" ? "Administratör" : "Lagerpersonal"}</span>
            </div>
          </div>
          {organization.role === "admin" && <button type="button" className="profile-menu-row" aria-haspopup="dialog"
            onClick={() => { setOpen(false); setActiveSheet("organization"); }}>
            <span className="profile-menu-icon"><AppIcon name="settings" width={18} height={18} /></span>
            <span>Företagsinställningar</span><AppIcon name="chevron" width={15} height={15} className="profile-menu-arrow" />
          </button>}
          <Link href="/organizations" className="profile-menu-row" onClick={() => setOpen(false)}>
            <span className="profile-menu-icon"><MaterialArrow name="swap" size={18} /></span>
            <span>Byt företag</span><AppIcon name="chevron" width={15} height={15} className="profile-menu-arrow" />
          </Link>
        </section>}
        <div className="profile-menu-section">
          <LogoutButton className="profile-menu-row profile-menu-logout" />
        </div>
      </div>
    </div>
    {activeSheet === "organization" && organization?.role === "admin" &&
      <OrganizationSettingsSheet organization={organization} onClose={closeSheet} />}
    {activeSheet === "account" && <AccountSettingsSheet account={account} onClose={closeSheet} />}
  </>;
}
