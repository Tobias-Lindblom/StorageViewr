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
      setError(
        error instanceof Error
          ? error.message
          : "Företaget kunde inte öppnas. Försök igen.",
      );
      setPendingId(null);
    }
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {organizations.map((organization) => {
          const selected = organization.id === selectedOrganizationId;
          const opening = organization.id === pendingId;
          const initials = organization.name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => Array.from(word)[0])
            .join("")
            .toLocaleUpperCase("sv");

          return (
            <button
              key={organization.id}
              type="button"
              onClick={() => selectOrganization(organization.id)}
              disabled={pendingId !== null}
              aria-busy={opening}
              className={`group flex min-h-22 w-full min-w-0 items-center gap-4 border-b border-line/60 px-4 py-4 text-left transition last:border-0 hover:bg-surface-raised disabled:opacity-60 sm:px-5 ${selected ? "bg-violet-500/5" : ""}`}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-base font-semibold text-accent ring-1 ring-inset ring-violet-400/20"
                aria-hidden="true"
              >
                {initials}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block wrap-break-word font-semibold">
                  {organization.name}
                </strong>
                <span className="mt-1 block wrap-break-word text-xs leading-5 text-muted">
                  {organization.slug}
                  <span aria-hidden="true"> · </span>
                  {organization.role === "admin"
                    ? "Administratör"
                    : "Lagerpersonal"}
                  {selected && (
                    <span className="text-accent"> · Valt företag</span>
                  )}
                </span>
              </span>
              {opening ? (
                <span className="shrink-0 text-xs text-muted" role="status">
                  Öppnar…
                </span>
              ) : (
                <span
                  className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent"
                  aria-hidden="true"
                >
                  <MaterialArrow name="forward" />
                </span>
              )}
              <span className="sr-only">
                {returnTo ? "Öppna lagerplats" : "Öppna översikt"}
              </span>
            </button>
          );
        })}
      </div>
      {pendingId && (
        <p className="sr-only" role="status">
          Öppnar företaget…
        </p>
      )}
      {error && (
        <p className="error mt-4" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
