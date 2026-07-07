/*
 * Minimal service worker.
 *
 * Its main job is to make the app installable as a PWA — Chromium requires a
 * registered service worker with a `fetch` handler before it fires
 * `beforeinstallprompt`. It deliberately keeps caching to a bare minimum (only
 * the app shell, "/") so it never serves stale API responses or assets:
 *   - Non-navigation requests (JS/CSS/API/socket) are left to the network.
 *   - Navigations are network-first, falling back to the cached shell offline.
 */

const CACHE = "gec-shell-v1";
const SHELL_URL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(SHELL_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions of this worker.
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  // Only handle top-level navigations; everything else uses the default network
  // path (no respondWith) so dynamic data and websockets are never intercepted.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(SHELL_URL))
  );
});
