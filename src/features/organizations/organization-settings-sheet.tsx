"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { OrganizationForm } from "./organization-form";

export function OrganizationSettingsSheet({
  name,
  slug,
  onClose,
}: {
  name: string;
  slug: string;
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
        Uppgifterna visas för alla medlemmar i företaget.
      </p>
      <div className="mb-5">
        <p className="text-sm font-medium">Företagskod</p>
        <div className="field-readonly">
          <span className="break-all">{slug}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          Företagets unika identifierare kan inte ändras.
        </p>
      </div>
      <OrganizationForm
        id="organization-settings-form"
        name={name}
        hideSubmit
        onPendingChange={setPending}
      />
    </BottomSheet>
  );
}
