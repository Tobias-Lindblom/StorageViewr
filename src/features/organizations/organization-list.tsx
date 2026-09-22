"use client";
import { MaterialArrow } from "@/components/material-arrow";


import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "@/lib/client-api";

type Organization = { id: string; name: string; slug: string; role: string };

export function OrganizationList({
  organizations,
  returnTo,
  selectedOrganizationId,
}: {
  organizations: Organization[];
  returnTo?: string;
  selectedOrganizationId?: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function selectOrganization(organizationId: string) {
    if (pendingId) return;
    setPendingId(organizationId);
    setError("");
    try {
      await clientApi("/api/organizations/select", "POST", { organizationId });
      router.push(returnTo ?? "/dashboard");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Företaget kunde inte öppnas. Försök igen.");
      setPendingId(null);
    }
  }

  return (
    <div>
      <div className={organizations.length === 1 ? "grid gap-4" : "grid gap-4 md:grid-cols-2"}>
        {organizations.map(organization => {
          const selected = organization.id === selectedOrganizationId;
          const opening = organization.id === pendingId;
          const initials = organization.name.trim().split(/\s+/).slice(0, 2)
            .map(word => Array.from(word)[0]).join("").toLocaleUpperCase("sv");

          return (
            <button
              key={organization.id}
              type="button"
              onClick={() => selectOrganization(organization.id)}
              disabled={pendingId !== null}
              aria-busy={opening}
              className={`group flex min-w-0 flex-col rounded-2xl border p-5 text-left transition hover:border-accent/70 hover:bg-surface-raised disabled:opacity-60 sm:p-6 ${selected ? "border-violet-400/40 bg-gradient-to-br from-violet-900/20 to-surface" : "border-line bg-surface"}`}
            >
              <span className="mb-5 flex w-full items-center justify-between gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-lg font-semibold text-accent" aria-hidden="true">
                  {initials}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] ${organization.role === "admin" ? "border-cyan/15 bg-cyan/5 text-cyan" : "border-line bg-surface-raised text-muted"}`}>
                  {organization.role === "admin" ? "Administratör" : "Lagerpersonal"}
                </span>
              </span>
              <strong className="mb-1.5 w-full break-words text-lg font-semibold sm:text-xl">{organization.name}</strong>
              <span className="mb-5 w-full break-words text-xs leading-5 text-muted">
                {organization.slug}{selected && <span className="ml-2 text-accent">· Valt företag</span>}
              </span>
              <span className="mt-auto flex min-h-11 w-full items-center justify-between gap-3 border-t border-line/70 pt-4 text-sm font-medium text-foreground">
                <span>{opening ? "Öppnar…" : returnTo ? "Öppna lagerplats" : "Öppna översikt"}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-accent transition group-hover:bg-violet-500/20" aria-hidden="true"><MaterialArrow name="forward" /></span>
              </span>
            </button>
          );
        })}
      </div>
      {pendingId && <p className="sr-only" role="status">Öppnar företaget…</p>}
      {error && <p className="error mt-4" role="alert">{error}</p>}
    </div>
  );
}
