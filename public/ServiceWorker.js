// Service worker - mandatory for PWA installability
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => {});
self.addEventListener("fetch", () => {}); // Listener fetch wajib ada supaya Chrome anggap ini PWA valid
