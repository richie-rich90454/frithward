export interface GpuReport {
    available: boolean;
    adapterName: string | null;
    vendor: string | null;
    architecture: string | null;
    computePassRan: boolean;
    limitations: string[];
    error: string | null;
}

export interface GpuDetectionPort {
    detect(signal: AbortSignal): Promise<GpuReport>;
}
