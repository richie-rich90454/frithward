import { afterEach, describe, expect, it, vi } from "vitest";
import { applyRuntimeBase, getRouterBase, getRuntimeBase } from "./base";

function stubDocument(scriptSrc: string) {
    let baseElement: { href: string } | null = null;
    vi.stubGlobal("document", {
        baseURI: "http://localhost/",
        head: {
            querySelector: () => baseElement,
            prepend: (element: { href: string }) => {
                baseElement = element;
            },
        },
        createElement: () => ({ href: "" }),
        querySelector: (selector: string) =>
            selector.includes("script") ? { src: scriptSrc } : null,
    });
    return () => baseElement;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("runtime base", () => {
    it("derives a sub-path base from the entry script URL", () => {
        stubDocument("http://localhost/frithward/assets/index-abc.js");
        expect(getRuntimeBase()).toEqual({ href: "/frithward/", router: "/frithward" });
        expect(getRouterBase()).toBe("/frithward");
    });

    it("derives the root base from the entry script URL", () => {
        stubDocument("http://localhost/assets/index-abc.js");
        expect(getRuntimeBase()).toEqual({ href: "/", router: "" });
    });

    it("sets the document <base href> before the router starts", () => {
        const getBase = stubDocument("http://localhost/frithward/assets/index-abc.js");
        expect(applyRuntimeBase()).toBe("/frithward/");
        expect(getBase()?.href).toBe("/frithward/");
    });
});
