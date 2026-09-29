"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { clientApi } from "@/lib/client-api";
import { CSV_MAX_BYTES } from "@/validation/product";
import type { ProductImportResult } from "./import";

export function ProductImport() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState<"," | ";">(",");
  const [snapshot, setSnapshot] = useState("");
  const [preview, setPreview] = useState<ProductImportResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [imported, setImported] = useState<number | null>(null);
  function reset() {
    setPreview(null);
    setSnapshot("");
    setError("");
  }
  async function inspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    reset();
    setPending(true);
    try {
      if (!file) throw new Error("Välj en CSV-fil.");
      if (file.size > CSV_MAX_BYTES)
        throw new Error("Filen får vara högst 500 kB.");
      const csv = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      const result = await clientApi<ProductImportResult>(
        "/api/products/import",
        "POST",
        { csv, delimiter, mode: "preview" },
      );
      setSnapshot(csv);
      setPreview(result);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Kunde inte läsa filen.",
      );
    } finally {
      setPending(false);
    }
  }
  async function commit() {
    if (!preview || pending) return;
    setPending(true);
    setError("");
    try {
      const result = await clientApi<ProductImportResult>(
        "/api/products/import",
        "POST",
        {
          csv: snapshot,
          delimiter,
          mode: "commit",
          expectedOrganizationId: preview.organizationId,
        },
      );
      setImported(result.imported);
      setPreview(null);
      setSnapshot("");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Importen misslyckades.",
      );
      setPreview(null);
      setSnapshot("");
    } finally {
      setPending(false);
    }
  }
  if (imported !== null)
    return (
      <section className="max-w-2xl" role="status">
        <h2 className="mb-4! text-xl!">Importen är klar</h2>
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-cyan">
              <AppIcon name="check" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">{imported} produkter har lagts till</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Produkterna finns nu i företagets produktregister.
              </p>
            </div>
          </div>
          <div className="mt-5 border-t border-line/60 pt-5">
            <Link href="/products" className="button w-full sm:w-auto">
              Visa produkter
            </Link>
          </div>
        </div>
      </section>
    );
  return (
    <div className="max-w-3xl space-y-8">
      <form onSubmit={inspect}>
        <section aria-labelledby="csv-file-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 id="csv-file-heading" className="mb-0! text-xl!">Välj CSV-fil</h2>
            <a
              href="/templates/products.csv"
              download
              className="inline-flex min-h-11 items-center gap-2 text-sm text-accent"
            >
              <AppIcon name="download" width={18} height={18} />
              Ladda ned mall
            </a>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="p-5 sm:p-6">
              <p className="text-sm leading-6 text-muted">
                Använd en CSV-fil i UTF-8. Filen får innehålla högst 500 produkter och vara högst 500 kB.
              </p>
              <dl className="mt-5 grid gap-4 border-t border-line/60 pt-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted">Obligatoriska kolumner</dt>
                  <dd className="mt-1 font-medium"><code>sku</code>, <code>name</code></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Valfria kolumner</dt>
                  <dd className="mt-1 break-words font-medium"><code>barcode</code>, <code>description</code>, <code>imageUrl</code></dd>
                </div>
              </dl>
            </div>

            <fieldset disabled={pending} className="border-t border-line/60 p-5 sm:p-6">
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                aria-label="Välj CSV-fil"
                className="hidden"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  reset();
                }}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="button-secondary w-full sm:w-auto"
                  onClick={() => fileInput.current?.click()}
                >
                  {file ? "Byt fil" : "Välj fil"}
                </button>
                <div className="min-w-0 flex-1" aria-live="polite">
                  {file ? (
                    <>
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="mt-1 text-xs text-muted">{Math.ceil(file.size / 1024)} kB</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted">Ingen fil vald</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-medium">Avgränsare</p>
                <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Välj avgränsare">
                  {([
                    [",", "Komma (,)"],
                    [";", "Semikolon (;)"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={delimiter === value}
                      onClick={() => {
                        setDelimiter(value);
                        reset();
                      }}
                      className={
                        "min-h-12 rounded-xl border px-3 text-sm transition " +
                        (delimiter === value
                          ? "border-violet-400/60 bg-violet-500/15 text-foreground"
                          : "border-line bg-canvas text-muted hover:border-accent/70")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>

            <div className="border-t border-line/60 p-5 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-6">
              <p className="mb-4 text-xs leading-5 text-muted sm:mb-0">
                Befintliga produkter skrivs inte över.
              </p>
              <button className="button w-full shrink-0 sm:w-auto" disabled={pending || !file}>
                {pending ? "Bearbetar…" : "Förhandsgranska"}
              </button>
            </div>
          </div>
        </section>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <section aria-labelledby="import-preview">
          <h2 id="import-preview" className="mb-4! text-xl!">Förhandsgranskning</h2>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <dl className="grid grid-cols-3 divide-x divide-line/60 p-5 text-center sm:p-6" role="status">
              {[
                ["Rader", preview.total],
                ["Redo", preview.valid],
                ["Med fel", preview.invalid],
              ].map(([label, value]) => (
                <div key={label} className="px-2">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-1 text-xl font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            {preview.invalid > 0 && (
              <div className="border-t border-line/60 p-5 sm:p-6">
                <p className="error">
                  Rätta felen och välj filen igen. Alla rader måste vara giltiga före importen.
                </p>
              </div>
            )}
            <ul className="max-h-96 overflow-y-auto border-t border-line/60">
              {preview.rows.map((row) => (
                <li key={row.line} className="border-b border-line/60 px-5 py-4 last:border-0 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="wrap-break-word text-sm font-medium">{row.name || "Namn saknas"}</p>
                      <p className="mt-1 break-all text-xs text-muted">{row.sku || "Artikelnummer saknas"}</p>
                    </div>
                    <span className={"shrink-0 text-xs " + (row.errors.length ? "text-rose-200" : "text-cyan")}>
                      {row.errors.length ? "Fel" : "Redo"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted">Rad {row.line}</p>
                  {row.errors.map((message, index) => (
                    <p key={index} className="mt-2 wrap-break-word text-xs leading-5 text-rose-200">{message}</p>
                  ))}
                </li>
              ))}
            </ul>
            <div className="border-t border-line/60 p-5 sm:flex sm:justify-end sm:p-6">
              <button
                type="button"
                className="button w-full sm:w-auto"
                disabled={pending || preview.invalid > 0}
                onClick={commit}
              >
                {pending ? "Importerar…" : "Importera " + preview.total + " produkter"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
