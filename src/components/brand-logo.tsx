import Link from "next/link";

export function BrandLogo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="brand inline-flex items-center gap-2 text-lg! sm:text-xl!"
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-400/40 bg-violet-500/15"
        aria-hidden="true"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          <path
            d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 9 9-4M12 12 3 8m9 4v9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-foreground!">
        StorageViewr<span>.</span>
      </span>
    </Link>
  );
}
