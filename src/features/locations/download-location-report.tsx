"use client";
import { useState } from "react";
import { AppIcon } from "@/components/app-icon";

export function DownloadLocationReport({
  warehouseId,
}: {
  warehouseId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setBusy(true);
    setError("");
    try {
      const query = warehouseId
        ? "?" + new URLSearchParams({ warehouseId })
        : "";
      const response = await fetch("/api/locations/report" + query, {
        cache: "no-store",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(
          result?.error?.message ??
            "Lagerplatsrapporten kunde inte hämtas. Försök igen.",
        );
      }
      if (!response.headers.get("Content-Type")?.startsWith("application/pdf"))
        throw new Error("Svaret var inte en PDF-rapport. Försök igen.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        /filename="([^"]+)"/.exec(
          response.headers.get("Content-Disposition") ?? "",
        )?.[1] ?? "lagerplatsrapport.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Lagerplatsrapporten kunde inte hämtas.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 flex-1 sm:flex-none">
      <button
        type="button"
        className="button-secondary w-full gap-2! whitespace-nowrap px-4! sm:w-auto"
        onClick={download}
        disabled={busy}
        aria-busy={busy}
      >
        <AppIcon name="download" />
        {busy ? "Skapar PDF…" : "Ladda ner PDF"}
      </button>
      {error && (
        <p
          role="alert"
          className="mt-3 max-w-sm text-sm leading-6 text-rose-200"
        >
          {error}
        </p>
      )}
    </div>
  );
}
