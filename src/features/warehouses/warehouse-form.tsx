"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clientApi } from "@/lib/client-api";
import type { getWarehouse } from "./service";

export function WarehouseForm({
  initial,
}: {
  initial?: Awaited<ReturnType<typeof getWarehouse>>;
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
        initial ? "/api/warehouses/" + initial.id : "/api/warehouses",
        initial ? "PATCH" : "POST",
        {
          name: form.get("name"),
          code: form.get("code"),
          address: form.get("address"),
          ...(initial ? { active: form.get("active") === "on" } : {}),
        },
      );
      router.push("/warehouses/" + result.id);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Kunde inte spara lagret.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="panel max-w-2xl space-y-6">
      <label>
        Lagernamn
        <input
          name="name"
          required
          minLength={2}
          maxLength={100}
          defaultValue={initial?.name}
          placeholder="Exempel: Borås lager"
        />
      </label>
      <label>
        Lagerkod
        <input
          name="code"
          required
          maxLength={20}
          defaultValue={initial?.code}
          placeholder="BORAS"
          autoCapitalize="characters"
        />
        <span className="mt-2 block text-xs font-normal text-muted">
          En unik kod inom företaget, exempelvis BORAS eller LAGER-01.
        </span>
      </label>
      <label>
        Adress <span className="font-normal text-muted">(valfritt)</span>
        <input
          name="address"
          maxLength={300}
          defaultValue={initial?.address}
          autoComplete="street-address"
        />
      </label>
      {initial && (
        <div>
          <label className="flex min-h-13 items-center gap-3">
            <input
              className="!m-0 !h-5 !min-h-0 !w-5 accent-violet-500"
              type="checkbox"
              name="active"
              defaultChecked={initial.active}
            />
            Aktivt lager
          </label>
          <p className="text-xs leading-6 text-muted">
            Ett lager kan inaktiveras när alla dess lagerplatser är inaktiva.
            Historiken behålls.
          </p>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button className="button" disabled={pending}>
          {pending ? "Sparar…" : initial ? "Spara lager" : "Skapa lager"}
        </button>
        <Link
          className="button-secondary"
          href={initial ? "/warehouses/" + initial.id : "/warehouses"}
        >
          Avbryt
        </Link>
      </div>
    </form>
  );
}
