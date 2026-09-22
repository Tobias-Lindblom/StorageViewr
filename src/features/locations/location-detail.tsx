import { MaterialArrow } from "@/components/material-arrow";
import Image from "next/image";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { locationQr } from "./labels";
import type { getLocation } from "./service";

export async function LocationDetail({ location, admin }: { location: Awaited<ReturnType<typeof getLocation>>; admin: boolean }) {
  const qr = location.active && location.warehouseActive ? await locationQr(location.qrToken) : null;
  return <>
    <PageHeading eyebrow={location.warehouseName} title={location.code}
      description={location.active ? "En fysisk plats i ditt lager." : "Den här lagerplatsen är inaktiv."}
      action={admin && location.warehouseActive ? <Link className="button-secondary" href={"/locations/" + location.id + "/edit"}>Redigera plats</Link> : undefined} />
    <div className="grid gap-5 md:grid-cols-[1fr_280px]">
      <section className="panel"><h2>Platsuppgifter</h2><dl className="grid grid-cols-2 gap-6 text-sm">
        {[["Zon", location.zone], ["Sektion", location.shelf], ["Position", location.position], ["Status", location.active ? "Aktiv" : "Inaktiv"]].map(([label, value]) => <div key={label}><dt className="mb-2 text-muted">{label}</dt><dd className="font-medium">{value}</dd></div>)}
      </dl><Link className="mt-7 inline-flex min-h-13 items-center gap-2 text-sm text-cyan" href={"/warehouses/" + location.warehouseId}>Visa {location.warehouseName} <MaterialArrow name="forward" /></Link></section>
      {qr && <section className="panel flex flex-col items-center !p-5"><h2 className="text-lg">Platsens QR-kod</h2><Image src={qr.image} alt={"QR-kod för " + location.code} width={216} height={216} unoptimized className="h-auto max-w-full rounded-xl" /><Link href={qr.url} className="mt-3 inline-flex min-h-13 items-center gap-2 text-sm text-cyan">Öppna QR-länken <MaterialArrow name="outward" /></Link><Link className="button-secondary mt-2 w-full" href={"/locations/labels?warehouseId=" + location.warehouseId}>Visa etiketter</Link></section>}
    </div>
  </>;
}
