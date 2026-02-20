const CACHE = "dc-one-v1";
const ASSETS = ["./", "./index.html", "./styles.css", "./script.js", "./manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // 1) Nunca interceptar requests do Supabase
  if (url.hostname.endsWith("supabase.co")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // 2) App shell cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
