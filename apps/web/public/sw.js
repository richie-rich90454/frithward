// Frithward offline app shell. Plain JS: runs in the SW scope, no bundler involved.
const CACHE_NAME = "frithward-shell-v1";
const MANIFEST_URL = "/precache-manifest.json";
const SHELL_FALLBACK = "/index.html";

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            let manifest = [];
            try {
                const response = await fetch(MANIFEST_URL, { cache: "no-store" });
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        manifest = data.filter(
                            (url) => typeof url === "string" && url.startsWith("/"),
                        );
                    }
                }
            } catch {
                // Keep the core shell even when the manifest is unavailable.
            }

            const urls = [...new Set(["/", SHELL_FALLBACK, MANIFEST_URL, ...manifest])];
            // addAll() aborts on the first failure; add() per URL keeps a partial cache useful.
            await Promise.allSettled(urls.map((url) => cache.add(url)));
            await self.skipWaiting();
        })(),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter((key) => key.startsWith("frithward-shell-") && key !== CACHE_NAME)
                    .map((key) => caches.delete(key)),
            );
            await self.clients.claim();
        })(),
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === "navigate") {
        event.respondWith(
            (async () => {
                try {
                    const response = await fetch(request);
                    if (response.ok) {
                        const cache = await caches.open(CACHE_NAME);
                        await cache.put(SHELL_FALLBACK, response.clone());
                    }
                    return response;
                } catch {
                    const cache = await caches.open(CACHE_NAME);
                    const cached =
                        (await cache.match(request)) ||
                        (await cache.match(SHELL_FALLBACK)) ||
                        (await cache.match("/"));
                    return cached || Response.error();
                }
            })(),
        );
        return;
    }

    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(request, { ignoreVary: true });
            if (cached) return cached;
            const response = await fetch(request);
            if (response.ok) {
                await cache.put(request, response.clone());
            }
            return response;
        })(),
    );
});
