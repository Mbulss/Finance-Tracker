// Minimal service worker - prevents "Unexpected token '<'" when browser or extension requests this file.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => {});
