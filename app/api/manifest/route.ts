import { NextResponse } from "next/server";

const MANIFEST = {
  name: "Finance Tracker",
  short_name: "Finance Tracker",
  description: "Personal finance tracker with web dashboard and Telegram",
  start_url: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#0ea5e9",
  icons: [] as unknown[],
};

export function GET() {
  return NextResponse.json(MANIFEST, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
