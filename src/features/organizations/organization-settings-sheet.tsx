"use client";

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
  return (
    <BottomSheet title="Företagsinställningar" onClose={onClose}>
      <p className="mb-6 text-sm text-muted">
        Företagskod: <span className="break-all text-foreground">{slug}</span>
      </p>
      <OrganizationForm name={name} />
    </BottomSheet>
  );
}
