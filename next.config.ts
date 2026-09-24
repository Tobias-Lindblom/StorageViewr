import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/inventory/sessions/*/report": ["./assets/fonts/*.ttf"],
  },
};
export default config;
