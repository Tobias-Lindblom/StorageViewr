import Link from "next/link";
import { MaterialArrow } from "@/components/material-arrow";
import type { listInventories } from "./session-queries";

export function InventoryList({
  result,
  completed = false,
  admin = false,
}: {
  result: Awaited<ReturnType<typeof listInventories>>;
  completed?: boolean;
  admin?: boolean;
}) {
  const basePath = completed ? "/inventories/completed" : "/inventories";
  return (
    <>
      {result.items.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {result.items.map((item) => (
            <Link
              key={item.id}
              href={"/inventories/" + item.id}
              className="panel block transition hover:border-accent/60"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="mb-0! wrap-break-word text-lg!">{item.name}</h2>
                <MaterialArrow className="shrink-0 text-accent" />
              </div>
              <p className="mt-2 text-sm text-muted">{item.warehouseName}</p>
              <div className="mt-6 flex flex-wrap justify-between gap-2 text-xs">
                <span className="text-cyan">
                  {completed ? "Genomförd" : "Pågående"}
                </span>
                <span>{item.counted} av {item.total} platser</span>
              </div>
              {completed ? (
                item.completedAt && (
                  <p className="mt-3 text-xs text-muted">
                    Genomförd {new Date(item.completedAt).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" })}
                  </p>
                )
              ) : (
                <progress
                  aria-label="Räknade platser"
                  value={item.counted}
                  max={item.total || 1}
                  className="mt-3 h-1.5 w-full accent-violet-500"
                />
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="panel">
          <h2>{completed ? "Inga genomförda inventeringar" : "Inga pågående inventeringar"}</h2>
          <p className="text-sm leading-7 text-muted">
            {completed
              ? "Här samlas inventeringarna när de har genomförts. Öppna en inventering för att se räkningarna eller ladda ner PDF-rapporten."
              : admin
                ? "Starta en inventering och välj vilka lagerplatser som ska räknas."
                : "Här visas inventeringar när en administratör startar dem."}
          </p>
        </div>
      )}
      {result.pages > 1 && (
        <nav aria-label="Inventeringssidor" className="mt-6 flex items-center justify-between gap-3">
          {result.page > 1 ? (
            <Link className="button-secondary" href={basePath + "?page=" + (result.page - 1)}>
              Föregående
            </Link>
          ) : <span />}
          <span className="text-xs text-muted">{result.page} / {result.pages}</span>
          {result.page < result.pages && (
            <Link className="button-secondary" href={basePath + "?page=" + (result.page + 1)}>
              Nästa
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
