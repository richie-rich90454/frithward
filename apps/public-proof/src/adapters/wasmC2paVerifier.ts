import wasmUrl from "@contentauth/c2pa-wasm/assets/c2pa_bg.wasm?url";
import { createWasmC2paVerifier } from "@frithward/provenance-core/wasm-c2pa-verifier";

/** Real browser-side C2PA verification using the official WASM SDK. */
export const wasmC2paVerifier = createWasmC2paVerifier(wasmUrl);
