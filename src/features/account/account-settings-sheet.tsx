"use client";

import { BottomSheet } from "@/components/bottom-sheet";
import { AccountForm } from "./account-form";

export function AccountSettingsSheet({
  account,
  onClose,
}: {
  account: { name: string; email: string };
  onClose: () => void;
}) {
  return (
    <BottomSheet title="Kontoinställningar" onClose={onClose}>
      <p className="mb-6 text-sm leading-6 text-muted">
        Dina personliga uppgifter gäller i alla dina företag.
      </p>
      <AccountForm name={account.name} email={account.email} embedded />
    </BottomSheet>
  );
}
