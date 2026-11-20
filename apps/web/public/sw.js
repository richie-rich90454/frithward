// Frithward offline app shell. Plain JS: runs in the SW scope, no bundler involved.
const CACHE_NAME = "frithward-shell-v1";
// Resolve every URL against the registration scope so the app works under any sub-path.
const SCOPE = new URL(self.registration.scope);
const MANIFEST_URL = new URL("precache-manifest.json", SCOPE).href;
const SHELL_FALLBACK = new URL("index.html", SCOPE).href;
const ROOT_URL = SCOPE.href;

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
                            (url) => typeof url === "string" && url.startsWith("./"),
                        );
                    }
                }
            } catch {
                // Keep the core shell even when the manifest is unavailable.
            }

            const urls = [
                ...new Set([
                    ROOT_URL,
                    SHELL_FALLBACK,
                    MANIFEST_URL,
                    ...manifest.map((url) => new URL(url, SCOPE).href),
                ]),
            ];
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

    // Share-target navigations (e.g. /check?text=...) keep navigate mode; a query string never
    // matches a cached URL, so the fallback below serves the cached shell offline as intended.
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
                        (await cache.match(ROOT_URL));
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
