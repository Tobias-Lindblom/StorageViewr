import localFont from "next/font/local";

export const workspaceFont = localFont({
  src: [
    { path: "../../assets/fonts/Roboto-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../assets/fonts/Roboto-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-workspace",
  display: "swap",
});

