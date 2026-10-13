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
      {compact ? (
        <BrandCube />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/35 bg-violet-500/12" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 9 9-4M12 12 3 8m9 4v9"
              stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      <span className="text-foreground!">StorageViewr{!compact && <span>.</span>}</span>
    </Link>
  );
}
