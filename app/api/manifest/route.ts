import { NextResponse } from "next/server";

const MANIFEST = {
  name: "Finance Tracker AI",
  short_name: "Finance Tracker AI",
  description: "Personal finance tracker with web dashboard and Telegram",
  start_url: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#0ea5e9",
  icons: [{ src: "/favicon.png", sizes: "any", type: "image/png", purpose: "any" }],
};

export function GET() {
  return NextResponse.json(MANIFEST, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
