"use client";

import Link from "next/link";
import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { AppIcon } from "@/components/app-icon";
import { OrganizationForm } from "./organization-form";
import type { OrganizationDocumentDetails } from "./types";

export function OrganizationSettingsSheet({
  organization,
  onClose,
}: {
  organization: OrganizationDocumentDetails & { name: string; slug: string };
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);

  return (
    <BottomSheet
      title="Företagsinställningar"
      onClose={onClose}
      footer={
        <button
          type="submit"
          form="organization-settings-form"
          className="button w-full"
          disabled={pending}
        >
          {pending ? "Sparar…" : "Spara ändringar"}
        </button>
      }
    >
      <p className="sheet-description">
        Uppgifterna visas för företagets medlemmar och kan användas i rapporter och andra dokument.
      </p>
      <Link href="/settings/organization/members" className="organization-members-link" onClick={onClose}>
        <span><AppIcon name="user" width={19} height={19} /></span>
        <span><strong>Medlemmar och behörigheter</strong><small>Bjud in personer och välj deras åtkomst.</small></span>
        <AppIcon name="chevron" width={16} height={16} />
      </Link>
      <div className="mb-5">
        <p className="text-sm font-medium">Företagskod</p>
        <div className="field-readonly">
          <span className="break-all">{organization.slug}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          Företagets unika identifierare kan inte ändras.
        </p>
      </div>
      <OrganizationForm
        id="organization-settings-form"
        name={organization.name}
        details={organization}
        hideSubmit
        onPendingChange={setPending}
      />
    </BottomSheet>
  );
}
