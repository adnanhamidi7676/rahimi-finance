// Rahimi Finance service worker.
//
// Deliberately conservative caching: this is a live, multi-admin finance app,
// so we NEVER cache Supabase API/auth responses or any cross-origin request.
// We only cache the static app shell (Next.js build assets, icons, manifest)
// so the app is installable and the shell loads instantly / works offline.

const CACHE = "rahimi-shell-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/offline", "/manifest.webmanifest"]).catch(() => {}),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheableStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only ever touch same-origin GETs. Supabase (a different origin) and any
  // POST/auth traffic falls through to the network untouched.
  if (url.origin !== self.location.origin) return;

  // App-shell navigations: network-first, fall back to cached offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () => caches.match(OFFLINE_URL).then((r) => r ?? Response.error()),
      ),
    );
    return;
  }

  // Immutable build assets / icons: stale-while-revalidate.
  if (isCacheableStatic(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached ?? network;
      }),
    );
  }
});
