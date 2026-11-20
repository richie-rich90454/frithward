export interface RuntimeBase {
    /** Absolute path with a trailing slash, e.g. "/" or "/frithward/". */
    href: string;
    /** Solid Router base, e.g. "" or "/frithward". */
    router: string;
}

function normalize(path: string): string {
    const withLeading = path.startsWith("/") ? path : `/${path}`;
    return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

function fromAssetUrl(url: string | undefined): string | null {
    if (!url) return null;
    try {
        const pathname = new URL(url, document.baseURI).pathname;
        const marker = pathname.lastIndexOf("/assets/");
        if (marker < 0) return null;
        return normalize(pathname.slice(0, marker));
    } catch {
        return null;
    }
}

function fromEnv(): string | null {
    const env = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env;
    const value = env?.BASE_URL;
    if (!value || value === "./" || value === ".") return null;
    return normalize(value);
}

/**
 * Resolves the deployment base before the router starts. The built entry script
 * carries an absolute base (import.meta.env.BASE_URL); its resolved URL is the
 * runtime source of truth when a host rewrites deep links to index.html.
 */
export function getRuntimeBase(): RuntimeBase {
    if (typeof document !== "undefined") {
        const script = document.querySelector<HTMLScriptElement>('script[type="module"][src]');
        const fromScript = fromAssetUrl(script?.src ?? undefined);
        if (fromScript) return { href: fromScript, router: fromScript.slice(0, -1) };

        const style = document.querySelector<HTMLLinkElement>('link[rel="stylesheet"][href]');
        const fromStyle = fromAssetUrl(style?.href ?? undefined);
        if (fromStyle) return { href: fromStyle, router: fromStyle.slice(0, -1) };
    }

    const href = fromEnv() ?? "/";
    return { href, router: href === "/" ? "" : href.slice(0, -1) };
}

/** Sets <base href> before Solid Router initializes and returns the applied base. */
export function applyRuntimeBase(): string {
    const { href } = getRuntimeBase();
    if (typeof document !== "undefined") {
        let base = document.head.querySelector<HTMLBaseElement>("base");
        if (!base) {
            base = document.createElement("base");
            document.head.prepend(base);
        }
        base.href = href;
    }
    return href;
}

export function getRouterBase(): string {
    return getRuntimeBase().router;
}
