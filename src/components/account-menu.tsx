"use client";
import { MaterialArrow } from "@/components/material-arrow";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AppIcon } from "./app-icon";
import { LogoutButton } from "./logout-button";
import { AccountSettingsSheet } from "@/features/account/account-settings-sheet";
import { OrganizationSettingsSheet } from "@/features/organizations/organization-settings-sheet";

export function AccountMenu({
  account,
  organization,
}: {
  account: { name: string; email: string };
  organization?: { name: string; slug: string; role: "admin" | "warehouse" };
}) {
  const [open, setOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<
    "account" | "organization" | null
  >(null);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const initials = account.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("")
    .toLocaleUpperCase("sv");
  const menuLink =
    "group flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground transition hover:bg-white/[0.045]";
  const menuIcon =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.035] text-muted transition group-hover:text-accent";

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      )
        setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <div
        ref={container}
        className="relative shrink-0"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setOpen(false);
        }}
      >
        <button
          ref={trigger}
          type="button"
          aria-label="Företag och konto"
          aria-expanded={open}
          aria-controls={menuId}
          className="group inline-flex h-12 w-12 items-center justify-center rounded-xl text-accent"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/35 bg-violet-500/12 transition group-hover:border-violet-300/60 group-hover:bg-violet-500/20 group-aria-expanded:border-violet-300/60 group-aria-expanded:bg-violet-500/25">
            <svg
              aria-hidden="true"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d={open ? "m6 6 12 12M6 18 18 6" : "M5 7h14M5 12h14M5 17h14"}
              />
            </svg>
          </span>
        </button>
        <div
          id={menuId}
          hidden={!open}
          className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100dvh-6rem)] w-76 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-line/55 bg-surface/95 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        >
          <section aria-label="Ditt konto">
            <div className="flex min-w-0 items-center gap-3 px-2 py-3">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/12 text-sm font-semibold text-accent"
              >
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{account.name}</p>
                <p className="mt-1 truncate text-xs text-muted">
                  {account.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => {
                setOpen(false);
                setActiveSheet("account");
              }}
              className={menuLink + " w-full text-left"}
            >
              <span className={menuIcon}>
                <AppIcon name="user" />
              </span>
              <span>Kontoinställningar</span>
              <MaterialArrow
                name="forward"
                size={17}
                className="ml-auto text-muted/70"
              />
            </button>
          </section>
          {organization && (
            <section
              aria-label="Aktuellt företag"
              className="mt-2 border-t border-line/50 pt-2"
            >
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                Aktuellt företag
              </p>
              <div className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-accent">
                  <AppIcon name="warehouse" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {organization.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {organization.role === "admin"
                      ? "Administratör"
                      : "Lagerpersonal"}
                  </p>
                </div>
              </div>
              {organization.role === "admin" && (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => {
                    setOpen(false);
                    setActiveSheet("organization");
                  }}
                  className={menuLink + " w-full text-left"}
                >
                  <span className={menuIcon}>
                    <AppIcon name="settings" />
                  </span>
                  <span>Företagsinställningar</span>
                  <MaterialArrow
                    name="forward"
                    size={17}
                    className="ml-auto text-muted/70"
                  />
                </button>
              )}
              <Link
                href="/organizations"
                onClick={() => setOpen(false)}
                className={menuLink}
              >
                <span className={menuIcon}>
                  <MaterialArrow name="swap" size={19} />
                </span>
                <span>Byt företag</span>
              </Link>
            </section>
          )}
          <div className="mt-2 border-t border-line/50 pt-2">
            <LogoutButton className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-muted transition hover:bg-rose-400/10 hover:text-rose-200 disabled:opacity-60" />
          </div>
        </div>
      </div>
      {activeSheet === "organization" &&
        organization &&
        organization.role === "admin" && (
          <OrganizationSettingsSheet
            name={organization.name}
            slug={organization.slug}
            onClose={() => {
              setActiveSheet(null);
              trigger.current?.focus();
            }}
          />
        )}
      {activeSheet === "account" && (
        <AccountSettingsSheet
          account={account}
          onClose={() => {
            setActiveSheet(null);
            trigger.current?.focus();
          }}
        />
      )}
    </>
  );
}
