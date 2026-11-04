type Props = { src: string; alt: string; className?: string; eager?: boolean; size?: "detail" | "thumbnail" };

function sourceForSize(src: string, size: Props["size"]) {
  if (size !== "thumbnail" || !src.startsWith("/api/products/")) return src;
  return src + (src.includes("?") ? "&" : "?") + "size=thumbnail";
}

export function ProductPhoto({ src, alt, className, eager = false, size = "detail" }: Props) {
  // Fetch private photos directly with session cookies, without the public image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={sourceForSize(src, size)} alt={alt} className={className} loading={eager ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" />;
}
