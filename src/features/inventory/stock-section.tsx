"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import type { StockData } from "./service";
import { PlacementEditor } from "./placement-editor";
import { StockEditor } from "./stock-editor";
import { TransferEditor } from "./transfer-editor";
import type { Scope, Choice, EditorActionState } from "./stock-types";
import { QuickActions, type MovementType, type QuickActionType } from "@/components/quick-actions";
import { EmptyState } from "@/components/empty-state";
import { ProductPlacementList } from "@/features/products/product-placement-list";
import { LocationProductList } from "@/features/locations/location-product-list";

export function StockSection({
  data,
  scope,
  choices,
  locationChoices,
  operable,
  admin,
  inventoryAction,
}: {
  data: StockData;
  scope: Scope;
  choices: Choice[];
  locationChoices: Choice[];
  operable: boolean;
  admin: boolean;
  inventoryAction?: ReactNode;
}) {
  const [selection, setSelection] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [transferring, setTransferring] = useState(false);
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
  const [transferAction, setTransferAction] = useState<EditorActionState>({
    disabled: true,
    label: "Flytta material",
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
  function openTransfer() {
    opener.current = document.activeElement as HTMLElement;
    setTransferAction({ disabled: true, label: "Flytta material" });
    setTransferring(true);
    setNotice("");
  }
  function closeTransfer() {
    setTransferring(false);
    requestAnimationFrame(() => opener.current?.focus());
  }
  function handleQuickAction(type: QuickActionType) {
    if (type === "TRANSFER") openTransfer();
    else open("", type);
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
      className={compact ? "product-stock-section" : "location-stock-section"}
      aria-labelledby={"stock-" + scope.kind}
    >
      <div className={compact ? "product-stock-heading" : "location-stock-heading"}>
        <div>
          <h2 id={"stock-" + scope.kind}>
            {scope.kind === "product"
              ? "Lagerplatser (" + data.items.length + ")"
              : "Produkter på platsen (" + data.items.length + ")"}
          </h2>

        </div>
        {operable && (
          <div className="shrink-0">
            <button
              className={compact ? "product-place-button" : "location-place-button"}
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
      {data.items.length ? (compact ? <ProductPlacementList items={data.items} /> : <LocationProductList items={data.items} />) : (
        <EmptyState icon={scope.kind === "product" ? "location" : "product"}
          title={scope.kind === "product" ? "Inga lagerplatser" : "Inga produkter"}>
          {scope.kind === "product"
            ? "Inga lagerpositioner ännu. Placera produkten på en lagerplats för att börja arbeta med saldot."
            : "Inga lagerpositioner ännu. Placera produkter här för att börja arbeta med lagerplatsen."}
        </EmptyState>
      )}
      {operable && <div className={compact ? "product-quick-actions" : "location-quick-actions"}>
        <h3>Snabbåtgärder</h3>
        {inventoryAction}
        <QuickActions admin={compact && admin} onAction={handleQuickAction} />
      </div>}
      {selection !== null && (
        <BottomSheet
          title="Registrera lagerhändelse"
          onClose={close}
          footer={
            <button
              type="submit"
              form="stock-editor-form"
              className={"button w-full " + (stockAction.tone === "RECEIPT" ? "button-receipt" : "")}
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
      {transferring && (
        <BottomSheet
          title="Flytta material"
          onClose={closeTransfer}
          footer={
            <button
              type="submit"
              form="transfer-editor-form"
              className="button w-full"
              disabled={transferAction.disabled}
            >
              {transferAction.label}
            </button>
          }
        >
          <TransferEditor
            scope={scope}
            stock={data}
            locationChoices={locationChoices}
            onActionStateChange={setTransferAction}
            onSaved={() => {
              closeTransfer();
              setNotice("Flytten har registrerats och lagerplatserna har uppdaterats.");
              router.refresh();
            }}
          />
        </BottomSheet>
      )}
    </section>
  );
}
