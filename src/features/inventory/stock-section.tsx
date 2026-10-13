"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { MaterialArrow } from "@/components/material-arrow";
import type { StockData } from "./service";
import { PlacementEditor } from "./placement-editor";
import { StockEditor } from "./stock-editor";
import type { Scope, Choice, EditorActionState } from "./stock-types";
import { QuickActions, type MovementType } from "@/components/quick-actions";
import { ProductPhoto } from "@/components/product-photo";
import { AppIcon } from "@/components/app-icon";
import { ProductPlacementList } from "@/features/products/product-placement-list";

export function StockSection({
  data,
  scope,
  choices,
  transferLocations,
  operable,
  admin,
}: {
  data: StockData;
  scope: Scope;
  choices: Choice[];
  transferLocations: Choice[];
  operable: boolean;
  admin: boolean;
}) {
  const [selection, setSelection] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [initialType, setInitialType] = useState<MovementType>("RECEIPT");
  const [notice, setNotice] = useState("");
  const [stockAction, setStockAction] = useState<EditorActionState>({
    disabled: true,
    label: "Registrera lagerhändelse",
  });
  const [placementAction, setPlacementAction] = useState<EditorActionState>({
    disabled: true,
    label: "Placera med 0 st",
  });
  const opener = useRef<HTMLElement | null>(null);
  const router = useRouter();
  function open(id = "", type: MovementType = "RECEIPT") {
    setInitialType(type);
    opener.current = document.activeElement as HTMLElement;
    setStockAction({
      disabled: true,
      label: "Registrera lagerhändelse",
    });
    setSelection(id);
    setNotice("");
  }
  function close() {
    setSelection(null);
    requestAnimationFrame(() => opener.current?.focus());
  }
  function openPlacement() {
    opener.current = document.activeElement as HTMLElement;
    setPlacementAction({
      disabled: true,
      label: "Placera med 0 st",
    });
    setPlacing(true);
    setNotice("");
  }
  function closePlacement() {
    setPlacing(false);
    requestAnimationFrame(() => opener.current?.focus());
  }
  const placedIds = new Set(
    data.items.map((row) =>
      scope.kind === "product" ? row.locationId : row.productId,
    ),
  );
  const placementChoices = choices.filter((item) => !placedIds.has(item.id));
  const compact = scope.kind === "product";
  return (
    <section
      className={compact ? "product-stock-section" : "mt-6"}
      aria-labelledby={"stock-" + scope.kind}
    >
      <div className={compact ? "product-stock-heading" : "mb-3 flex flex-wrap items-center justify-between gap-3"}>
        <div>
          <h2 id={"stock-" + scope.kind} className={compact ? "" : "mb-1!"}>
            {scope.kind === "product"
              ? "Lagerplatser (" + data.items.length + ")"
              : "Produkter på platsen"}
          </h2>
          {!compact && <p className="text-sm text-muted">
            {scope.kind === "product"
              ? "Totalt " +
                BigInt(data.total).toLocaleString("sv-SE") +
                " st · " +
                (data.items.length === 1
                  ? "1 lagerplats"
                  : data.items.length + " lagerplatser")
              : data.items.length === 1
                ? "1 produkt"
                : data.items.length + " produkter"}
          </p>}
        </div>
        {operable && (
          <div className="shrink-0">
            <button
              className={compact ? "product-place-button" : "button-secondary min-h-11! px-3! py-2! text-xs!"}
              onClick={openPlacement}
            >
              + Placera
            </button>

          </div>
        )}
      </div>
      {notice && (
        <p className="mb-4 text-sm text-cyan" role="status">
          {notice}
        </p>
      )}
      {data.items.length ? compact ? <ProductPlacementList items={data.items} /> : (
        <ul className="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line bg-surface">
          {data.items.map((row) => (
            <li key={row.id} className="p-3 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                {scope.kind === "location" && row.photoUrl ?
                  <ProductPhoto src={row.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-line bg-canvas object-contain" /> :
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-accent"><AppIcon name={scope.kind === "product" ? "location" : "product"} /></span>}
                <Link
                  className="min-w-0 flex-1"
                  href={
                    scope.kind === "product"
                      ? "/locations/" + row.locationId
                      : "/products/" + row.productId
                  }
                >
                  <p className="wrap-break-word text-sm font-medium">
                    {scope.kind === "product"
                      ? row.locationCode
                      : row.productName}
                  </p>
                  <p className="mt-1 wrap-break-word text-xs leading-5 text-muted">
                    {scope.kind === "product" ? row.warehouseName : "SKU " + row.sku}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-sm font-semibold tabular-nums sm:text-xl">
                    {row.quantity.toLocaleString("sv-SE")}{" "}
                    <span className="text-xs font-normal text-muted">st</span>
                  </p>
                  <MaterialArrow size={18} className="text-muted" />
                </div>
              </div>
              {!row.active && (
                <p className="mt-2 text-xs text-muted">
                  Inaktiv produkt eller plats
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={compact ? "product-list-empty text-sm text-muted" : "rounded-2xl border border-line bg-surface p-5 text-sm leading-7 text-muted"}>
          {scope.kind === "product"
            ? "Produkten är inte placerad på någon lagerplats."
            : "Inga produkter är placerade på den här lagerplatsen."}
        </p>
      )}
      {operable && <div className={compact ? "product-quick-actions" : "mb-5"}>
        <h3 className={compact ? "" : "mb-3 text-sm font-semibold"}>Snabbåtgärder</h3>
        <QuickActions admin={admin} onAction={type => open("", type)} />
      </div>}
      {selection !== null && (
        <BottomSheet
          title="Registrera lagerhändelse"
          onClose={close}
          footer={
            <button
              type="submit"
              form="stock-editor-form"
              className={"button w-full " + (stockAction.tone === "RECEIPT" ? "button-receipt" : stockAction.tone === "ISSUE" ? "button-issue" : "")}
              disabled={stockAction.disabled}
            >
              {stockAction.label}
            </button>
          }
        >
          <StockEditor
            scope={scope}
            initialType={initialType}
            choices={choices}
            transferLocations={transferLocations}
            initialChoice={selection}
            admin={admin}
            onActionStateChange={setStockAction}
            onSaved={() => {
              close();
              setNotice("Lagerhändelsen har registrerats.");
              router.refresh();
            }}
          />
        </BottomSheet>
      )}
      {placing && (
        <BottomSheet
          title="Placera produkt"
          onClose={closePlacement}
          footer={
            <button
              type="submit"
              form="placement-editor-form"
              className="button w-full"
              disabled={placementAction.disabled}
            >
              {placementAction.label}
            </button>
          }
        >
          <PlacementEditor
            scope={scope}
            choices={placementChoices}
            onActionStateChange={setPlacementAction}
            onSaved={() => {
              closePlacement();
              setNotice("Produkten har placerats med 0 st i saldo.");
              router.refresh();
            }}
          />
        </BottomSheet>
      )}
    </section>
  );
}
