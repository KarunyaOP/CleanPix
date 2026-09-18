const CACHE_NAME = "cleanpix-cache-v1";
const OFFLINE_FALLBACK_URL = "/offline";

const PRECACHE_ASSETS = [
  "/",
  "/offline",
  "/manifest.json",
  "/branding/logo/cleanpix-icon.svg",
  "/branding/favicon/favicon-192x192.png",
  "/branding/favicon/favicon-512x512.png",
  "/branding/favicon/favicon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn("[SW] Precache failed during install:", err);
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests or chrome-extension schemes
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Skip Razorpay, Cloudinary uploads, and auth API requests from caching
  if (
    url.pathname.startsWith("/api/razorpay") ||
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/api/remove-background") ||
    url.pathname.startsWith("/api/upload")
  ) {
    return;
  }

  // HTML page navigations -> Network first with Offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;
        const fallback = await cache.match(OFFLINE_FALLBACK_URL);
        if (fallback) return fallback;
        return new Response("You are currently offline.", {
          headers: { "Content-Type": "text/plain" },
        });
      })
    );
    return;
  }

  // Static Assets (fonts, images, scripts, styles) -> Cache first with network fallback
  if (
    url.pathname.startsWith("/branding/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // All other requests -> Network first with Cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
