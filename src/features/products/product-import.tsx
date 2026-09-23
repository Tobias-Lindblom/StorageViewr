"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { clientApi } from "@/lib/client-api";
import { CSV_MAX_BYTES } from "@/validation/product";
import type { ProductImportResult } from "./import";

export function ProductImport() {
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
      <section className="panel max-w-2xl" role="status">
        <h2>Importen är klar</h2>
        <p className="mb-6 text-muted">{imported} produkter har lagts till.</p>
        <Link href="/products" className="button">
          Visa produkter
        </Link>
      </section>
    );
  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={inspect} className="panel space-y-5">
        <div>
          <h2 className="mb-2!">Välj din fil</h2>
          <p className="text-sm leading-7 text-muted">
            CSV i UTF-8, högst 500 kB och 500 produkter. Obligatoriska kolumner:{" "}
            <code>sku</code> och <code>name</code>. Valfria:{" "}
            <code>barcode</code>, <code>description</code> och{" "}
            <code>imageUrl</code>.
          </p>
          <a
            href="/templates/products.csv"
            download
            className="inline-flex min-h-13 items-center text-sm text-accent"
          >
            Ladda ned CSV-mall
          </a>
        </div>
        <fieldset disabled={pending} className="space-y-5">
          <label>
            CSV-fil
            <input
              type="file"
              accept=".csv,text/csv"
              required
              className="min-w-0 text-sm! file:mr-3 file:rounded-lg file:border-0 file:bg-surface-raised file:px-3 file:py-2 file:text-accent"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                reset();
              }}
            />
          </label>
          <label>
            Avgränsare
            <select
              value={delimiter}
              onChange={(event) => {
                setDelimiter(event.target.value as "," | ";");
                reset();
              }}
            >
              <option value=",">Komma (,)</option>
              <option value=";">Semikolon (;)</option>
            </select>
          </label>
          <button className="button" disabled={pending}>
            {pending ? "Bearbetar…" : "Förhandsgranska"}
          </button>
        </fieldset>
        <p className="text-xs leading-6 text-muted">
          Importen lägger till nya produkter. Befintliga produkter skrivs inte
          över.
        </p>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <section className="panel" aria-labelledby="import-preview">
          <h2 id="import-preview">Förhandsgranskning</h2>
          <p className="mb-5 text-sm leading-7 text-muted" role="status">
            {preview.total} produkter · {preview.valid} redo · {preview.invalid}{" "}
            med fel
          </p>
          {preview.invalid > 0 && (
            <p className="error mb-5">
              Rätta felen och välj filen igen. Hela filen måste vara giltig
              innan den kan importeras.
            </p>
          )}
          <ul className="max-h-96 space-y-3 overflow-y-auto rounded-xl border border-line p-3">
            {preview.rows.map((row) => (
              <li
                key={row.line}
                className="border-b border-line/60 pb-3 last:border-0 last:pb-0"
              >
                <p className="text-xs text-muted">Rad {row.line}</p>
                <p className="mt-1 wrap-break-word text-sm font-medium">
                  {row.name || "Namn saknas"}
                </p>
                <p className="mt-1 break-all text-xs text-accent">
                  {row.sku || "Artikelnummer saknas"}
                </p>
                {row.errors.map((message, index) => (
                  <p
                    key={index}
                    className="mt-2 wrap-break-word text-xs leading-6 text-rose-200"
                  >
                    {message}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="button mt-5"
            disabled={pending || preview.invalid > 0}
            onClick={commit}
          >
            {pending
              ? "Importerar…"
              : "Importera " + preview.total + " produkter"}
          </button>
        </section>
      )}
    </div>
  );
}
