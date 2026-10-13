"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { clientApi } from "@/lib/client-api";

type Organization = { id: string; name: string; slug: string; role: string };

export function OrganizationList({ organizations, returnTo, selectedOrganizationId }: {
  organizations: Organization[]; returnTo?: string; selectedOrganizationId?: string;
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

  return <div>
    <ul className="organization-list">
      {organizations.map(organization => {
        const selected = organization.id === selectedOrganizationId;
        const opening = organization.id === pendingId;
        const initials = organization.name.trim().split(/\s+/).slice(0, 2)
          .map(word => Array.from(word)[0] ?? "").join("").toLocaleUpperCase("sv");
        return <li key={organization.id} className="min-w-0">
          <button type="button" onClick={() => selectOrganization(organization.id)}
            disabled={pendingId !== null} aria-busy={opening} aria-current={selected ? "true" : undefined}
            className={"organization-row" + (selected ? " is-selected" : "")}>
            <span className="organization-avatar" aria-hidden="true">{initials}</span>
            <span className="organization-identity">
              <span className="organization-name">
                <strong>{organization.name}</strong>
                {selected && <span className="organization-selected-tag">Valt</span>}
              </span>
              <span className="organization-metadata">
                {organization.slug}<span aria-hidden="true"> · </span>
                {organization.role === "admin" ? "Administratör" : "Lagerpersonal"}
              </span>
            </span>
            {opening ? <span className="organization-opening" role="status">Öppnar…</span> :
              <AppIcon name="chevron" width={16} height={16} className="organization-row-arrow" />}
            <span className="sr-only">{returnTo ? "Öppna lagerplats" : "Öppna översikt"}</span>
          </button>
        </li>;
      })}
    </ul>
    {pendingId && <p className="sr-only" role="status">Öppnar företaget…</p>}
    {error && <p className="error mt-4" role="alert">{error}</p>}
  </div>;
}
