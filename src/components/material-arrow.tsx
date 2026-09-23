import paths from "./icons/material-arrow-paths.json";

// Google Material Icons (Rounded), Apache-2.0. See docs/licenses/material-icons.md.
export function MaterialArrow({
  name = "forward",
  size = 20,
  className = "",
}: {
  name?: keyof typeof paths;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={"inline-block shrink-0 align-middle " + className}
    >
      {paths[name].map((path, index) => (
        <path key={index} d={path} />
      ))}
    </svg>
  );
}
