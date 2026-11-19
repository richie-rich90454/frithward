import { describe, expect, it } from "vitest";
import { parseDomain } from "./scam.js";

describe("parseDomain", () => {
    it("extracts the registrable domain from a URL with a subdomain", () => {
        expect(parseDomain("https://sub.example.co.uk")).toBe("example.co.uk");
    });

    it("accepts a bare hostname", () => {
        expect(parseDomain("login.example.com")).toBe("example.com");
    });

    it("returns null for input without a domain", () => {
        expect(parseDomain("not a domain")).toBeNull();
    });
});
