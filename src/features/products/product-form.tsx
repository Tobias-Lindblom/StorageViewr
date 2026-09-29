"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clientApi } from "@/lib/client-api";
import type { getProduct } from "./service";
import { ProductPhotoPicker } from "./product-photo-picker";

export function ProductForm({
  initial,
}: {
  initial?: Awaited<ReturnType<typeof getProduct>>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [photoBusy, setPhotoBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || photoBusy) return;
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
          imageUrl: photo === undefined ? initial?.imageUrl ?? "" : "",
          ...(photo !== undefined ? { photo } : {}),
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
    <form onSubmit={submit} className="max-w-2xl space-y-8">
      <fieldset disabled={pending || photoBusy} className="space-y-8">
        <section aria-labelledby="product-information-heading">
          <h2 id="product-information-heading" className="mb-4! text-xl!">
            Produktuppgifter
          </h2>
          <div className="space-y-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <label>
              Produktnamn
              <input
                name="name"
                required
                minLength={2}
                maxLength={160}
                defaultValue={initial?.name}
                placeholder="Exempel: Arbetshandske"
                autoComplete="off"
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
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
                <span className="mt-2 block text-xs font-normal leading-5 text-muted">
                  Unikt artikelnummer. Sparas med stora bokstäver.
                </span>
              </label>
              <label>
                Streckkod <span className="font-normal text-muted">(valfritt)</span>
                <input
                  name="barcode"
                  maxLength={100}
                  defaultValue={initial?.barcode}
                  placeholder="Skanna eller skriv in"
                  spellCheck={false}
                />
              </label>
            </div>

            <label>
              Beskrivning <span className="font-normal text-muted">(valfritt)</span>
              <textarea
                name="description"
                maxLength={2000}
                rows={3}
                defaultValue={initial?.description}
                placeholder="Kort information om produkten"
                className="mt-2 block w-full resize-y rounded-xl border border-line bg-canvas p-4 text-base text-foreground outline-none placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </label>

            {initial && (
              <div className="border-t border-line/60 pt-5">
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    className="m-0! h-5! min-h-0! w-5! accent-violet-500"
                    type="checkbox"
                    name="active"
                    defaultChecked={initial.active}
                  />
                  Aktiv produkt
                </label>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Produkter med saldo måste nollställas innan de kan inaktiveras.
                </p>
              </div>
            )}
          </div>
        </section>

        <ProductPhotoPicker
          existing={initial?.photoUrl || initial?.imageUrl}
          value={photo}
          onChange={setPhoto}
          onBusy={setPhotoBusy}
          disabled={pending}
        />
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 border-t border-line/60 pt-6 sm:flex-row sm:justify-end">
        <Link
          className="button-secondary w-full sm:w-auto"
          href={initial ? "/products/" + initial.id : "/products"}
        >
          Avbryt
        </Link>
        <button className="button w-full sm:w-auto" disabled={pending || photoBusy}>
          {pending ? "Sparar…" : initial ? "Spara ändringar" : "Skapa produkt"}
        </button>
      </div>
    </form>
  );
}
