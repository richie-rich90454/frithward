export interface WhisperIsolationGlobal {
    readonly SharedArrayBuffer?: unknown;
    readonly crossOriginIsolated?: boolean;
}

export function isCrossOriginIsolationAvailable(global: WhisperIsolationGlobal): boolean {
    return (
        typeof global.SharedArrayBuffer !== "undefined" && global.crossOriginIsolated === true
    );
}
