import { redirect } from "next/navigation";
import { pageTenant } from "@/lib/server/page-auth";

export default async function ScannerPage() {
  await pageTenant();
  redirect("/dashboard?scan=1");
}
