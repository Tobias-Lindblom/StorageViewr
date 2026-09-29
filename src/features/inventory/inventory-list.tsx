import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
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
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {result.items.map((item) => (
            <Link
              key={item.id}
              href={"/inventories/" + item.id}
              className="group block border-b border-line/60 p-5 transition last:border-0 hover:bg-surface-raised sm:p-6"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-accent">
                  <AppIcon name="inventory" width={19} height={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="mb-0! wrap-break-word text-base! font-semibold">{item.name}</h2>
                    <MaterialArrow
                      size={18}
                      className="mt-0.5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">{item.warehouseName}</p>

                  <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                    <span className={completed ? "text-cyan" : "text-accent"}>
                      {completed ? "Genomförd" : "Pågående"}
                    </span>
                    <span className="text-muted">{item.counted} av {item.total} platser</span>
                  </div>
                  {completed ? (
                    item.completedAt && (
                      <p className="mt-2 text-xs text-muted">
                        Avslutad {new Date(item.completedAt).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" })}
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
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-start gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-muted">
            <AppIcon name="inventory" />
          </span>
          <div className="min-w-0">
            <h2 className="mb-1! text-base!">
              {completed ? "Inga genomförda inventeringar" : "Inga pågående inventeringar"}
            </h2>
            <p className="text-sm leading-6 text-muted">
              {completed
                ? "Avslutade inventeringar och deras rapporter visas här."
                : admin
                  ? "Starta en inventering och välj vilka lagerplatser som ska räknas."
                  : "Pågående inventeringar visas här när en administratör har startat dem."}
            </p>
          </div>
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
