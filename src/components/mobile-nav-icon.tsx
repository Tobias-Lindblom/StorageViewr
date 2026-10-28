import { BrandCube } from "./brand-logo";

export type MobileNavIconName =
  | "dashboard"
  | "product"
  | "scan"
  | "location"
  | "more";

export function MobileNavIcon({
  name,
  size = 20,
}: {
  name: MobileNavIconName;
  size?: number;
}) {
  if (name === "product") return <BrandCube size={Math.max(1, size - 2)} />;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="mobile-nav-glyph"
    >
      {name === "dashboard" && (
        <>
          <rect x="3" y="3" width="8" height="8" rx="1.5" fill="var(--color-accent)" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#c6a4f5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#9254db" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" fill="var(--color-accent)" />
        </>
      )}
      {name === "location" && (
        <>
          <path
            fill="var(--color-accent)"
            d="M12 2a8 8 0 0 0-8 8c0 6.1 8 12 8 12s8-5.9 8-12a8 8 0 0 0-8-8Z"
          />
          <circle cx="12" cy="10" r="3" fill="#c6a4f5" />
        </>
      )}
      {name === "scan" && (
        <>
          <path fill="var(--color-accent)" d="M3 3h8v3H6v5H3V3Z" />
          <path fill="#c6a4f5" d="M13 3h8v8h-3V6h-5V3Z" />
          <path fill="#9254db" d="M3 13h3v5h5v3H3v-8Z" />
          <path fill="var(--color-accent)" d="M18 13h3v8h-8v-3h5v-5Z" />
          <rect x="9" y="9" width="6" height="6" rx="1.5" fill="#c6a4f5" />
        </>
      )}
      {name === "more" && (
        <>
          <circle cx="5" cy="12" r="2.25" fill="#9254db" />
          <circle cx="12" cy="12" r="2.25" fill="var(--color-accent)" />
          <circle cx="19" cy="12" r="2.25" fill="#c6a4f5" />
        </>
      )}
    </svg>
  );
}
