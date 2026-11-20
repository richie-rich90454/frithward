export interface GpuReport {
    available: boolean;
    adapterName: string | null;
    vendor: string | null;
    architecture: string | null;
    computePassRan: boolean;
    limitations: string[];
    error: string | null;
    errorCode?: string | undefined;
    limitationCodes?: readonly (string | undefined)[] | undefined;
}

export interface GpuDetectionPort {
    detect(signal: AbortSignal): Promise<GpuReport>;
}
