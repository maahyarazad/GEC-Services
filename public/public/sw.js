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
    (async () => {
      try {
        const response = await fetch(event.request);
        // Refresh the cached shell on every successful navigation. Without this
        // the copy stored at install time is never updated, so after a deploy
        // the offline fallback would serve HTML referencing content-hashed
        // assets that no longer exist — a blank page instead of a usable app.
        if (response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(SHELL_URL, response.clone());
        }
        return response;
      } catch {
        const cachedShell = await caches.match(SHELL_URL);
        // Nothing cached and no network: let the browser show its offline page.
        return cachedShell ?? Response.error();
      }
    })()
  );
});
