"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/bottom-sheet";
import { clientApi } from "@/lib/client-api";

export function DeleteLocation({
  locationId,
  code,
}: {
  locationId: string;
  code: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);

  function close() {
    setConfirming(false);
    setError("");
    requestAnimationFrame(() => trigger.current?.focus());
  }

  async function remove() {
    setPending(true);
    setError("");
    try {
      await clientApi("/api/locations/" + locationId, "DELETE");
      router.push("/locations");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Lagerplatsen kunde inte tas bort.",
      );
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="delete-location-heading"
      className="mt-10 max-w-2xl border-t border-rose-400/20 pt-7"
    >
      <h2 id="delete-location-heading" className="mb-2! text-lg! text-rose-200">
        Ta bort lagerplats
      </h2>
      <p className="text-sm leading-6 text-muted">
        Endast en oanvänd lagerplats kan tas bort permanent. Platser med saldo
        eller historik behöver behållas och kan inaktiveras.
      </p>

      <button
        ref={trigger}
        type="button"
        className="mt-5 inline-flex min-h-13 w-full items-center justify-center rounded-xl border border-rose-400/35 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/10 sm:w-auto"
        aria-haspopup="dialog"
        onClick={() => {
          setError("");
          setConfirming(true);
        }}
      >
        Ta bort lagerplats
      </button>

      {confirming && (
        <BottomSheet
          title="Ta bort lagerplats"
          onClose={close}
          footer={
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="button-secondary w-full"
                onClick={close}
                disabled={pending}
              >
                Avbryt
              </button>
              <button
                type="button"
                className="inline-flex min-h-13 w-full items-center justify-center rounded-xl border border-rose-400/40 bg-rose-950/40 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-900/50 disabled:opacity-60"
                onClick={remove}
                disabled={pending}
              >
                {pending ? "Tar bort…" : "Ta bort"}
              </button>
            </div>
          }
        >
          <div className="rounded-2xl border border-rose-400/25 bg-rose-950/20 p-5">
            <p className="font-medium text-foreground">
              Ta bort {code} permanent?
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Lagerplatsen och dess QR-kod försvinner och kan inte återställas.
            </p>
          </div>
          <p className="mt-5 text-sm leading-6 text-muted">
            Borttagning fungerar endast om platsen saknar saldo och historik.
          </p>
          {error && (
            <p className="error mt-5" role="alert">
              {error}
            </p>
          )}
        </BottomSheet>
      )}
    </section>
  );
}
