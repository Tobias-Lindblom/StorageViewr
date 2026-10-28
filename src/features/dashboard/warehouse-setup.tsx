import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { StartInventory } from "@/features/inventory/start-inventory";
import type { WarehouseSetupState } from "./setup-state";

type LocationChoice = {
  id: string;
  warehouseId: string;
  code: string;
};

export function WarehouseSetup({
  setup,
  locations,
  warehouses,
  admin,
}: {
  setup: WarehouseSetupState;
  locations: LocationChoice[];
  warehouses: { id: string; name: string }[];
  admin: boolean;
}) {
  const active = setup.activeInitialInventory;
  const target = setup.targetWarehouse;
  const targetLocations = target
    ? locations.filter((row) => row.warehouseId === target.id)
    : [];
  const inventoryProgress = active?.totalLocations
    ? Math.round(
        (active.countedLocations / active.totalLocations) * 100,
      )
    : 0;
  const foundationSteps = [
    setup.warehouseCount > 0,
    setup.locationCount > 0,
    setup.productCount > 0,
    setup.totalPositions > 0,
  ].filter(Boolean).length;
  const baselineProgress = setup.baselineWarehouseTotal
    ? setup.baselineWarehouseCount / setup.baselineWarehouseTotal
    : 0;
  const progress = Math.round(
    ((foundationSteps + baselineProgress) / 5) * 100,
  );
  const title =
    setup.phase === "BASELINE_IN_PROGRESS"
      ? "Första inventeringen pågår"
      : setup.phase === "READY_FOR_BASELINE"
        ? "Redo att etablera lagret"
        : "Etablera ert lager";
  const description =
    setup.phase === "BASELINE_IN_PROGRESS"
      ? "Fortsätt den fysiska räkningen. Saldona etableras först när inventeringen har granskats, signerats och slutförts."
      : setup.phase === "READY_FOR_BASELINE"
        ? "Genomför en första fysisk inventering för att sätta verifierade startsaldon."
        : "Slutför grunduppsättningen och genomför er första inventering för att skapa verifierade lagersaldon.";

  const steps = [
    {
      complete: setup.warehouseCount > 0,
      icon: "warehouse" as const,
      title:
        setup.warehouseCount > 0
          ? setup.warehouseCount.toLocaleString("sv-SE") +
            (setup.warehouseCount === 1 ? " lager skapat" : " lager skapade")
          : "Skapa ditt första lager",
      detail: "Den fysiska struktur där lagerplatserna hör hemma.",
    },
    {
      complete: setup.locationCount > 0,
      icon: "location" as const,
      title:
        setup.locationCount > 0
          ? setup.locationCount.toLocaleString("sv-SE") +
            (setup.locationCount === 1
              ? " lagerplats skapad"
              : " lagerplatser skapade")
          : "Skapa lagerplatser",
      detail: "Definiera de fysiska platser där produkterna finns.",
    },
    {
      complete: setup.productCount > 0,
      icon: "product" as const,
      title:
        setup.productCount > 0
          ? setup.productCount.toLocaleString("sv-SE") +
            (setup.productCount === 1 ? " produkt tillagd" : " produkter tillagda")
          : "Lägg till produkter",
      detail: "Lägg till manuellt eller importera ett befintligt produktregister.",
    },
    {
      complete: setup.totalPositions > 0,
      icon: "layers" as const,
      title:
        setup.totalPositions > 0
          ? setup.placedProductCount.toLocaleString("sv-SE") +
            (setup.placedProductCount === 1
              ? " produkt placerad"
              : " produkter placerade")
          : "Placera produkter",
      detail: setup.unplacedProductCount
        ? setup.unplacedProductCount.toLocaleString("sv-SE") +
          (setup.unplacedProductCount === 1
            ? " produkt saknar lagerplats"
            : " produkter saknar lagerplats")
        : "Produkterna är kopplade till sina fysiska lagerplatser.",
      warning: setup.unplacedProductCount > 0,
    },
    {
      complete: setup.baselineEstablished,
      active: setup.phase === "BASELINE_IN_PROGRESS",
      icon: "inventory" as const,
      title: setup.baselineEstablished
        ? "Första inventeringen slutförd"
        : active
          ? active.countedLocations.toLocaleString("sv-SE") +
            " av " +
            active.totalLocations.toLocaleString("sv-SE") +
            " platser räknade"
          : "Första inventeringen återstår",
      detail:
        setup.baselineWarehouseTotal > 1
          ? setup.baselineWarehouseCount.toLocaleString("sv-SE") +
            " av " +
            setup.baselineWarehouseTotal.toLocaleString("sv-SE") +
            " lager har en verifierad baseline."
          : "Räkna det fysiska lagret för att etablera verifierade startsaldon.",
    },
  ];

  let action;
  if (active) {
    action = (
      <Link className="button setup-primary-action" href={"/inventories/" + active.id}>
        Fortsätt inventeringen <AppIcon name="chevron" width={17} height={17} />
      </Link>
    );
  } else if (setup.phase === "NO_WAREHOUSE") {
    action = (
      <Link className="button setup-primary-action" href={admin ? "/warehouses/new" : "/warehouses"}>
        {admin ? "Skapa lager" : "Visa lager"} <AppIcon name="chevron" width={17} height={17} />
      </Link>
    );
  } else if (setup.phase === "NO_LOCATIONS") {
    action = (
      <Link className="button setup-primary-action" href={admin ? "/locations/new" : "/locations"}>
        {admin ? "Skapa lagerplatser" : "Visa lagerplatser"} <AppIcon name="chevron" width={17} height={17} />
      </Link>
    );
  } else if (setup.phase === "NO_PRODUCTS") {
    action = (
      <div className="setup-action-row">
        <Link className="button setup-primary-action" href={admin ? "/products/new" : "/products"}>
          {admin ? "Lägg till produkt" : "Visa produkter"} <AppIcon name="chevron" width={17} height={17} />
        </Link>
        {admin && <Link className="button-secondary" href="/products/import">Importera CSV</Link>}
      </div>
    );
  } else if (setup.phase === "UNPLACED_PRODUCTS") {
    action = (
      <Link className="button setup-primary-action" href="/products">
        Hantera produkter <AppIcon name="chevron" width={17} height={17} />
      </Link>
    );
  } else if (target && targetLocations.length && admin) {
    action = (
      <StartInventory
        warehouses={warehouses.filter((row) => row.id === target.id)}
        locations={targetLocations}
        initialWarehouseId={target.id}
        initialLocationIds={targetLocations.map((row) => row.id)}
        defaultName="Första inventeringen"
        baseline
        className="button setup-primary-action"
        label={<>Starta första inventeringen <AppIcon name="chevron" width={17} height={17} /></>}
      />
    );
  } else {
    action = (
      <p className="setup-admin-note">
        En administratör behöver starta den första inventeringen.
      </p>
    );
  }

  return (
    <section className="warehouse-setup" aria-labelledby="warehouse-setup-heading">
      <div className="setup-intro">
        <span className="setup-intro-icon"><AppIcon name="layers" width={28} height={28} /></span>
        <div>
          <h2 id="warehouse-setup-heading">{title}</h2>
          <p>{description}</p>
        </div>
        <strong>{setup.phase === "BASELINE_IN_PROGRESS" ? inventoryProgress : progress}%</strong>
      </div>
      <div className="setup-progress" role="progressbar" aria-label="Uppstartsprogress" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={setup.phase === "BASELINE_IN_PROGRESS" ? inventoryProgress : progress}>
        <span style={{ width: (setup.phase === "BASELINE_IN_PROGRESS" ? inventoryProgress : progress) + "%" }} />
      </div>
      <ol className="setup-steps">
        {steps.map((step, index) => <li key={step.title} className={step.complete ? "is-complete" : step.active ? "is-active" : ""}>
          <span className="setup-step-number">{step.complete ? <AppIcon name="check" width={17} height={17} /> : String(index + 1).padStart(2, "0")}</span>
          <span className="setup-step-icon"><AppIcon name={step.icon} width={21} height={21} /></span>
          <span className="setup-step-copy"><strong>{step.title}</strong><small className={step.warning ? "is-warning" : ""}>{step.detail}</small></span>
        </li>)}
      </ol>
      <div className="setup-footer">
        <div><strong>Låt oss fastställa vad som faktiskt finns i lagret.</strong>
          <span>Startsaldon skapas genom den fysiska inventeringen, inte genom en fiktiv inleverans.</span></div>
        {action}
      </div>
    </section>
  );
}
