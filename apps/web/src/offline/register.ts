export interface OfflineStatus {
    supported: boolean;
    online: boolean;
    controlled: boolean;
}

export type OfflineStatusListener = (status: OfflineStatus) => void;

export interface OfflineController {
    isSupported(): boolean;
    isOnline(): boolean;
    onStatusChange(listener: OfflineStatusListener): () => void;
}

let controller: OfflineController | undefined;

/**
 * Registers the offline service worker and exposes honest connection state.
 * Calling more than once is safe: the first call's controller is returned.
 */
export function registerOfflineSupport(): OfflineController {
    if (controller) return controller;

    const hasServiceWorker = typeof navigator !== "undefined" && "serviceWorker" in navigator;
    const supported =
        hasServiceWorker && typeof window !== "undefined" && window.isSecureContext;

    const listeners = new Set<OfflineStatusListener>();
    let controlled = hasServiceWorker && Boolean(navigator.serviceWorker.controller);

    const snapshot = (): OfflineStatus => ({
        supported,
        online: typeof navigator === "undefined" ? true : navigator.onLine,
        controlled,
    });

    const emit = (): void => {
        const status = snapshot();
        for (const listener of listeners) listener(status);
    };

    if (supported) {
        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
            // Registration may be blocked by policy; status remains honest.
        });
        navigator.serviceWorker.addEventListener("controllerchange", () => {
            controlled = Boolean(navigator.serviceWorker.controller);
            emit();
        });
    }

    if (typeof window !== "undefined") {
        window.addEventListener("online", emit);
        window.addEventListener("offline", emit);
    }

    controller = {
        isSupported: () => supported,
        isOnline: () => (typeof navigator === "undefined" ? true : navigator.onLine),
        onStatusChange(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
    return controller;
}
