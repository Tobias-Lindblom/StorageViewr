"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { AccountForm } from "./account-form";

export function AccountSettingsSheet({
  account,
  onClose,
}: {
  account: { name: string; email: string };
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);

  return (
    <BottomSheet
      title="Kontoinställningar"
      onClose={onClose}
      footer={
        <button
          type="submit"
          form="account-settings-form"
          className="button w-full"
          disabled={pending}
        >
          {pending ? "Sparar…" : "Spara ändringar"}
        </button>
      }
    >
      <p className="mb-6 text-sm leading-6 text-muted">
        Uppgifterna används i alla företag där du är medlem.
      </p>
      <AccountForm
        id="account-settings-form"
        name={account.name}
        email={account.email}
        embedded
        hideSubmit
        onPendingChange={setPending}
      />
    </BottomSheet>
  );
}
