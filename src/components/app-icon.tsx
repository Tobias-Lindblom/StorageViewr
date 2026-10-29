import type { SVGProps } from "react";
const paths = {
  info: "M12 11v6m0-10v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  keyboard: "M3 5h18v14H3zM6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10",
  more: "M4 12h.01M12 12h.01M20 12h.01",
  scan: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5M8 9h8M8 15h8",
  layers: "m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5",
  verified: "M8 12l3 3 5-6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  alert: "M12 8v5m0 3v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  plus: "M12 8v8M8 12h8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  minus: "M8 12h8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  edit: "m15 4 5 5M4 20l4-1L21 6l-5-5L3 14l1 6Z",
  history: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  filter: "M4 5h16M7 12h10M10 19h4",
  search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6",
  download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  transfer: "M7 7h12m-3-3 3 3-3 3M17 17H5m3 3-3-3 3-3",
  document: "M6 3h8l4 4v14H6V3Zm8 0v5h5M9 12h6M9 16h6",
  check: "M5 12l4 4L19 6",
  chevron: "m9 5 7 7-7 7",
  inventory: "M9 3h6v4H9zM9 5H5v16h14V5h-4M8 12l2 2 5-5M8 18h8",
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8ZM6.5 12h3l1.5-3 2 6 1.5-3h3",
  target: "M21 12a9 9 0 1 1-9-9M18 12a6 6 0 1 1-6-6M15 12a3 3 0 1 1-3-3M12 2v10l6-6",
  chart: "M4 20V11M10 20V5M16 20v-7M22 20V8",
  units: "M19 6a7 3 0 1 1-14 0 7 3 0 0 1 14 0ZM5 6v5a7 3 0 0 0 14 0V6M5 11v5a7 3 0 0 0 14 0v-5",
  tag: "M20 13 13 20 4 11V4h7l9 9ZM8 8h.01",
  coins: "M12 7a5 3 0 1 1-10 0 5 3 0 0 1 10 0ZM2 7v4a5 3 0 0 0 8 2.4M2 11v4a5 3 0 0 0 6 2.9M22 13a5 3 0 1 1-10 0 5 3 0 0 1 10 0Zm-10 0v4a5 3 0 0 0 10 0v-4m-10 4v3a5 3 0 0 0 10 0v-3",
  camera: "M3 7h4l2-3h6l2 3h4v14H3V7Zm13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  close: "M6 6l12 12M18 6 6 18",
  expand: "M9 4H4v5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  product: "m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 9 9-4M12 12 3 8m9 4v9M7.5 5.5l9 5",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21v-2a7 7 0 0 1 14 0v2",
  dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  warehouse: "M3 21V8l9-5 9 5v13M3 21h18M8 21V11h8v10M8 15h8M8 18h8",
  location:
    "M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0ZM9 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  settings: "M4 7h16M4 17h16M8 4v6M16 14v6",
  logout: "M10 5H5v14h5M14 8l4 4-4 4M8 12h10",
  qr: "M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h3v3h-6z",
};
export type AppIconName = keyof typeof paths;
export function AppIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: AppIconName }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
