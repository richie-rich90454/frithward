export interface IsolationStatus {
    isolated: boolean;
    missing: string[];
}

/**
 * Reports whether this page can use SharedArrayBuffer-backed features.
 *
 * COOP/COEP can only be set by the host as response headers — a meta tag or a
 * service worker cannot. See the shipped static-host header configs under
 * apps/web and public/hosting-headers.json.
 */
export function getIsolationStatus(): IsolationStatus {
    const missing: string[] = [];

    if (globalThis.crossOriginIsolated !== true) {
        missing.push("cross-origin isolation (COOP/COEP headers)");
    }
    if (typeof globalThis.SharedArrayBuffer === "undefined") {
        missing.push("SharedArrayBuffer");
    }

    return { isolated: missing.length === 0, missing };
}
