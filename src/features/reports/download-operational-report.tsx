"use client";

import { useState } from "react";
import { AppIcon } from "@/components/app-icon";

export function DownloadOperationalReport({ kind, className }: {
  kind: "discrepancies" | "health";
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = kind === "discrepancies" ? "Avvikelserapport" : "Lagerhälsorapport";
  async function download() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/reports/" + kind, { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error?.message ?? title + "en kunde inte hämtas.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? title.toLocaleLowerCase("sv") + ".pdf";
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : title + "en kunde inte hämtas."); }
    finally { setBusy(false); }
  }
  return <div>
    <button type="button" className={className ?? "button-secondary w-full gap-2!"} onClick={download} disabled={busy}>
      <AppIcon name="download" />{busy ? "Skapar PDF…" : "Ladda ner PDF"}
    </button>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  </div>;
}
