import type { OrganizationDocumentDetails } from "./types";

type OrganizationDocumentDetailsSource = {
  [Key in keyof OrganizationDocumentDetails]?: string | null;
};

export function organizationDocumentDetails(
  organization: OrganizationDocumentDetailsSource,
): OrganizationDocumentDetails {
  return {
    organizationNumber: organization.organizationNumber ?? "",
    addressLine1: organization.addressLine1 ?? "",
    addressLine2: organization.addressLine2 ?? "",
    postalCode: organization.postalCode ?? "",
    city: organization.city ?? "",
    country: organization.country ?? "",
    contactEmail: organization.contactEmail ?? "",
    phone: organization.phone ?? "",
    website: organization.website ?? "",
  };
}
