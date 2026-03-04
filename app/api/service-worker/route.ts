const SW_CONTENT = `// Minimal service worker
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => {});
`;

export function GET() {
  return new Response(SW_CONTENT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
      "Service-Worker-Allowed": "/",
    },
  });
}
