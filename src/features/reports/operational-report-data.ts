import "server-only";

import type { TenantContext } from "@/lib/server/tenant";
import { Organization } from "@/models/organization";
import { organizationDocumentDetails } from "@/features/organizations/document-profile";
import { getInventoryHealthSummary } from "@/features/inventory/inventory-health";
import { listDiscrepancies } from "@/features/inventory/discrepancies";
import { AppError } from "@/lib/server/errors";

async function company(context: TenantContext) {
  const organization = await Organization.findOne({ _id: context.organizationId })
    .select("name organizationNumber addressLine1 addressLine2 postalCode city country contactEmail phone website").lean();
  if (!organization) throw new AppError(404, "ORGANIZATION_NOT_FOUND", "Företaget kunde inte hittas.");
  return { companyName: organization.name, companyDetails: organizationDocumentDetails(organization) };
}

export async function getDiscrepancyReport(context: TenantContext) {
  const [organization, rows] = await Promise.all([
    company(context),
    listDiscrepancies(context, { status: "ALL", limit: 2000 }),
  ]);
  return {
    ...organization,
    rows,
    summary: {
      total: rows.length,
      open: rows.filter(row => row.status === "OPEN").length,
      resolved: rows.filter(row => row.status === "RESOLVED").length,
      recounted: rows.filter(row => row.status === "RECOUNTED").length,
      openValueDifferenceUnits: rows.filter(row => row.status === "OPEN").reduce((sum, row) =>
        sum + (row.valueDifferenceUnits === null ? BigInt(0) : BigInt(row.valueDifferenceUnits)), BigInt(0)).toString(),
    },
  };
}

export async function getHealthReport(context: TenantContext) {
  const [organization, health] = await Promise.all([company(context), getInventoryHealthSummary(context)]);
  return { ...organization, health };
}

export type DiscrepancyReport = Awaited<ReturnType<typeof getDiscrepancyReport>>;
export type HealthReport = Awaited<ReturnType<typeof getHealthReport>>;
