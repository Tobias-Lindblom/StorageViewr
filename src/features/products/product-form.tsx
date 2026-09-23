"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clientApi } from "@/lib/client-api";
import type { getProduct } from "./service";

export function ProductForm({
  initial,
}: {
  initial?: Awaited<ReturnType<typeof getProduct>>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await clientApi<{ id: string }>(
        initial ? "/api/products/" + initial.id : "/api/products",
        initial ? "PATCH" : "POST",
        {
          sku: form.get("sku"),
          name: form.get("name"),
          barcode: form.get("barcode"),
          description: form.get("description"),
          imageUrl: form.get("imageUrl"),
          ...(initial ? { active: form.get("active") === "on" } : {}),
        },
      );
      router.push("/products/" + result.id);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Kunde inte spara produkten.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="panel max-w-2xl space-y-6">
      <fieldset disabled={pending} className="space-y-6">
        <label>
          Produktnamn
          <input
            name="name"
            required
            minLength={2}
            maxLength={160}
            defaultValue={initial?.name}
            placeholder="Exempel: Arbetshandske"
          />
        </label>
        <label>
          Artikelnummer (SKU)
          <input
            name="sku"
            required
            maxLength={64}
            defaultValue={initial?.sku}
            placeholder="HANDSKE-01"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <span className="mt-2 block text-xs font-normal leading-6 text-muted">
            Unikt inom företaget. Små bokstäver omvandlas till stora.
          </span>
        </label>
        <label>
          Streckkod <span className="font-normal text-muted">(valfritt)</span>
          <input
            name="barcode"
            maxLength={100}
            defaultValue={initial?.barcode}
            spellCheck={false}
          />
        </label>
        <label>
          Beskrivning <span className="font-normal text-muted">(valfritt)</span>
          <textarea
            name="description"
            maxLength={2000}
            rows={4}
            defaultValue={initial?.description}
            className="mt-2 block w-full resize-y rounded-xl border border-line bg-canvas p-4 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>
        <label>
          Bildlänk <span className="font-normal text-muted">(valfritt)</span>
          <input
            name="imageUrl"
            type="url"
            maxLength={2048}
            defaultValue={initial?.imageUrl}
            placeholder="https://"
          />
          <span className="mt-2 block text-xs font-normal text-muted">
            En länk till en bild via HTTPS.
          </span>
        </label>
        {initial && (
          <div>
            <label className="flex min-h-13 items-center gap-3">
              <input
                className="m-0! h-5! min-h-0! w-5! accent-violet-500"
                type="checkbox"
                name="active"
                defaultChecked={initial.active}
              />
              Aktiv produkt
            </label>
            <p className="text-xs leading-6 text-muted">
              Inaktiva produkter döljs för lagermedarbetare. Artikelnumret
              behålls.
            </p>
          </div>
        )}
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button className="button" disabled={pending}>
          {pending ? "Sparar…" : initial ? "Spara ändringar" : "Skapa produkt"}
        </button>
        <Link
          className="button-secondary"
          href={initial ? "/products/" + initial.id : "/products"}
        >
          Avbryt
        </Link>
      </div>
    </form>
  );
}
