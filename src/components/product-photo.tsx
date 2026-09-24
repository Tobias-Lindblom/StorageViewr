type Props = { src: string; alt: string; className?: string; eager?: boolean };
export function ProductPhoto({ src, alt, className, eager = false }: Props) {
  // Fetch private photos directly with session cookies, without the public image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading={eager ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" />;
}
