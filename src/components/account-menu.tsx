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
    "flex min-h-13 items-center gap-3 rounded-xl px-3 text-sm transition hover:bg-violet-400/10";

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
          className="group inline-flex h-13 w-13 items-center justify-center rounded-xl text-accent"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/40 bg-violet-500/15 transition group-hover:border-violet-300/60 group-hover:bg-violet-500/25 group-aria-expanded:bg-violet-500/25">
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
          className="absolute right-0 top-full z-50 mt-3 max-h-[calc(100dvh-7rem)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-3xl border border-violet-300/20 bg-surface p-3 shadow-2xl shadow-black/60"
        >
          <section aria-label="Ditt konto">
            <div className="px-3 pb-5 pt-3 text-center">
              <span
                aria-hidden="true"
                className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-violet-300/40 bg-linear-to-br from-violet-400/30 via-violet-600/25 to-surface-raised text-xl font-semibold text-accent shadow-lg shadow-violet-950/30"
              >
                {initials}
              </span>
              <p className="wrap-break-word text-base font-semibold">
                {account.name}
              </p>
              <p className="mt-1 break-all text-xs leading-5 text-muted">
                {account.email}
              </p>
            </div>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => {
                setOpen(false);
                setActiveSheet("account");
              }}
              className="flex min-h-13 w-full items-center gap-3 rounded-full bg-violet-400/15 px-4 text-sm font-medium transition hover:bg-violet-400/25"
            >
              <span className="shrink-0 text-accent">
                <AppIcon name="user" />
              </span>
              Kontoinställningar
            </button>
          </section>
          {organization && (
            <section
              aria-label="Aktuellt företag"
              className="mt-3 rounded-2xl bg-surface-raised/70 p-2"
            >
              <div className="flex items-start gap-3 px-3 py-3">
                <span className="mt-0.5 shrink-0 text-accent">
                  <AppIcon name="warehouse" />
                </span>
                <div className="min-w-0">
                  <p className="wrap-break-word text-sm font-semibold">
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
                  <span className="shrink-0 text-muted">
                    <AppIcon name="settings" />
                  </span>
                  Företagsinställningar
                </button>
              )}
              <Link
                href="/organizations"
                onClick={() => setOpen(false)}
                className={menuLink}
              >
                <MaterialArrow name="swap" className="text-muted" />
                Byt företag
              </Link>
            </section>
          )}
          <div className="mt-4">
            <LogoutButton className="flex min-h-13 w-full items-center justify-center rounded-full border border-violet-300/25 bg-violet-400/10 px-4 text-sm font-medium transition hover:border-accent/60 hover:bg-violet-400/20 disabled:opacity-60" />
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
