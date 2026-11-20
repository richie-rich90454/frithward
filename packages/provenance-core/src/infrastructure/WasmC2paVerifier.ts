import init, { WasmReader, type InitInput } from "@contentauth/c2pa-wasm";
import { C2paSdkAdapter, type SdkManifestReader } from "./C2paSdkAdapter.js";

/** Maps magic bytes to the format hint the WASM reader needs to locate a JUMBF box. */
export function detectC2paFormat(bytes: Uint8Array): string {
    const at = (offset: number): number => bytes[offset] ?? -1;
    const ascii = (offset: number, length: number): string =>
        String.fromCharCode(...bytes.subarray(offset, offset + length));

    if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
    if (
        at(0) === 0x89 &&
        ascii(1, 3) === "PNG" &&
        at(4) === 0x0d &&
        at(5) === 0x0a &&
        at(6) === 0x1a &&
        at(7) === 0x0a
    )
        return "image/png";
    if (ascii(0, 4) === "RIFF") {
        if (ascii(8, 4) === "WEBP") return "image/webp";
        if (ascii(8, 4) === "WAVE") return "audio/wav";
    }
    if (ascii(4, 4) === "ftyp") {
        const brand = ascii(8, 4);
        if (brand === "avif" || brand === "avis") return "image/avif";
        if (/^(heic|heix|hevc|mif1|msf1)/.test(brand)) return "image/heic";
        return "video/mp4";
    }
    if ((ascii(0, 2) === "II" && at(2) === 0x2a) || (ascii(0, 2) === "MM" && at(2) === 0x2a))
        return "image/tiff";
    return "";
}

function describe(cause: unknown): string {
    if (cause instanceof Error) return cause.message;
    if (typeof cause === "string") return cause;
    return String(cause);
}

/**
 * Builds a verifier backed by the official @contentauth/c2pa-wasm SDK.
 *
 * `wasm` is injected rather than imported with Vite's `?url` syntax so this factory stays
 * usable from Node tests and from any bundler. Browser callers pass the emitted WASM URL;
 * tests pass raw bytes. The SDK's `WasmReader.fromBytes` performs the real cryptographic
 * validation (claim signature, assertion hashes, data hash) without browser-only Blob APIs.
 */
export function createWasmC2paVerifier(wasm: InitInput | Promise<InitInput>): C2paSdkAdapter {
    let ready: Promise<void> | null = null;
    const initialize = (): Promise<void> => {
        ready ??= init({ module_or_path: wasm }).then(
            () => undefined,
            (cause: unknown) => {
                ready = null;
                throw new Error(`C2PA WASM SDK failed to initialize: ${describe(cause)}`);
            },
        );
        return ready;
    };

    return new C2paSdkAdapter(async (source) => {
        await initialize();
        if (!("buffer" in source)) {
            throw new Error("Browser C2PA verification requires file bytes, not a filesystem path.");
        }

        let reader: WasmReader;
        try {
            reader = await WasmReader.fromBytes(detectC2paFormat(source.buffer), source.buffer);
        } catch (cause) {
            // The SDK reports an asset with no embedded JUMBF manifest this way. Returning
            // null lets the shared adapter report an honest "missing" result.
            if (describe(cause).includes("JumbfNotFound")) return null;
            throw new Error(`C2PA WASM SDK could not read this asset: ${describe(cause)}`);
        }

        let store: unknown;
        try {
            store = JSON.parse(reader.json());
        } finally {
            reader.free();
        }
        return { json: () => store } satisfies SdkManifestReader;
    });
}
