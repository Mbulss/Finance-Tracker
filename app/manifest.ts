import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finance Tracker AI",
    short_name: "Finance Tracker AI",
    description: "Personal finance tracker with web dashboard and Telegram",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0ea5e9",
    icons: [
      { src: "/favicon.png", sizes: "any", type: "image/png", purpose: "any" },
    ],
  };
}
