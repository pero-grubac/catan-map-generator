const CACHE_NAME = "catan-map-v3";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./map.js",
  "./manifest.json",
  "./fonts/cinzel-400.woff2",
  "./fonts/cinzel-600.woff2",
  "./fonts/cinzel-700.woff2",
  "./fonts/crimson-pro-400.woff2",
  "./fonts/crimson-pro-500.woff2",
  "./fonts/crimson-pro-600.woff2",
  "./fonts/oswald-400.woff2",
  "./fonts/oswald-600.woff2",
  "./fonts/oswald-700.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./images/forest.png",
  "./images/grain.png",
  "./images/sheep.png",
  "./images/rock.png",
  "./images/clay.png",
  "./images/desert.png",
  "./images/port.png",
];

const isLocal =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1";

// Install — skip caching on localhost
self.addEventListener("install", (event) => {
  if (isLocal) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
  self.skipWaiting();
});

// Activate — delete old caches (skip on localhost)
self.addEventListener("activate", (event) => {
  if (isLocal) {
    self.clients.claim();
    return;
  }
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

// Fetch — always network on localhost, cache-first on production
self.addEventListener("fetch", (event) => {
  if (isLocal) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          if (event.request.destination === "document") {
            return caches.match("./index.html");
          }
        })
      );
    }),
  );
});
