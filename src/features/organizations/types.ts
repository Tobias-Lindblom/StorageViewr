export type OrganizationDocumentDetails = {
  organizationNumber: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  contactEmail: string;
  phone: string;
  website: string;
};

export type OrganizationProfile = OrganizationDocumentDetails & {
  id: string;
  name: string;
  slug: string;
  role: "admin" | "warehouse";
};
