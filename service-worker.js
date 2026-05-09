const CACHE_NAME = "catan-map-v1";

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

// Install: cache all assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// Activate: delete old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch: cache-first strategy
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached || fetch(event.request)),
  );
});
