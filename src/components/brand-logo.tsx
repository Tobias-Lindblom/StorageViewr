import Link from "next/link";

export function BrandCube({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size + 2} viewBox="0 0 24 26" fill="none" aria-hidden="true">
      <path d="M12 1 23 7 12 13 1 7 12 1Z" fill="var(--color-accent)" />
      <path d="M1 8 11.5 13.7V25L1 19V8Z" fill="#9254db" />
      <path d="m12.5 13.7 10.5-5.7v11l-10.5 6V13.7Z" fill="#c6a4f5" />
    </svg>
  );
}

export function BrandLogo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className={compact ? "workspace-brand" : "brand inline-flex items-center gap-2.5 text-[1.15rem]! sm:text-xl!"}>
      <BrandCube size={compact ? 26 : 30} />
      <span className="text-foreground!">StorageViewr</span>
    </Link>
  );
}
