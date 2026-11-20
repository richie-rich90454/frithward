import { CodedError, ERROR_CODES, resultCodeForText } from "@frithward/contracts";
import type { GpuDetectionPort, GpuReport } from "../ports/GpuDetectionPort";

const BUFFER_USAGE_STORAGE = 0x0080;
const BUFFER_USAGE_COPY_SRC = 0x0004;
const BUFFER_USAGE_COPY_DST = 0x0008;
const MAP_MODE_READ = 0x0001;

const COMPUTE_SHADER = `
@group(0) @binding(0) var<storage, read_write> values: array<u32>;

@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    values[id.x] = values[id.x] + 1u;
}
`;

function checkAbort(signal: AbortSignal): void {
    if (signal.aborted)
        throw new CodedError(ERROR_CODES.GPU_DETECTION_ABORTED, "GPU detection was aborted.");
}

function unavailable(message: string): GpuReport {
    const limitations = [
        "WebGPU is unavailable, so no GPU capability check could be performed.",
        "Results from one browser and device do not generalise to other hardware.",
    ];
    return {
        available: false,
        adapterName: null,
        vendor: null,
        architecture: null,
        computePassRan: false,
        limitations,
        error: message,
        errorCode: resultCodeForText(message),
        limitationCodes: limitations.map(resultCodeForText),
    };
}

function message(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause);
}

export class WebGpuDetector implements GpuDetectionPort {
    public async detect(signal: AbortSignal): Promise<GpuReport> {
        checkAbort(signal);
        const gpu = (navigator as unknown as { gpu?: GPU }).gpu;
        if (!gpu) return unavailable("WebGPU is not available in this browser.");

        let adapter: GPUAdapter | null;
        try {
            adapter = await gpu.requestAdapter();
        } catch (cause) {
            return unavailable(`Unable to request a WebGPU adapter: ${message(cause)}`);
        }
        if (!adapter) return unavailable("No WebGPU adapter was found.");
        checkAbort(signal);

        let device: GPUDevice;
        try {
            device = await adapter.requestDevice();
        } catch (cause) {
            return unavailable(`Unable to request a WebGPU device: ${message(cause)}`);
        }

        const info = adapter.info;
        const report: GpuReport = {
            available: true,
            adapterName: info.device || info.description || null,
            vendor: info.vendor || null,
            architecture: info.architecture || null,
            computePassRan: false,
            limitations: [
                "A single compute pass only proves basic WebGPU support, not performance or model compatibility.",
                "Adapter metadata is reported by the browser and may be redacted for privacy.",
            ],
            error: null,
        };

        try {
            const module = device.createShaderModule({ code: COMPUTE_SHADER });
            const pipeline = device.createComputePipeline({
                layout: "auto",
                compute: { module, entryPoint: "main" },
            });
            const compute = device.createBuffer({
                size: 4,
                usage: BUFFER_USAGE_STORAGE | BUFFER_USAGE_COPY_SRC | BUFFER_USAGE_COPY_DST,
            });
            const readback = device.createBuffer({
                size: 4,
                usage: MAP_MODE_READ | BUFFER_USAGE_COPY_DST,
            });
            device.queue.writeBuffer(compute, 0, new Uint32Array([0]));
            const bindGroup = device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [{ binding: 0, resource: { buffer: compute } }],
            });
            const encoder = device.createCommandEncoder();
            const pass = encoder.beginComputePass();
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bindGroup);
            pass.dispatchWorkgroups(1);
            pass.end();
            encoder.copyBufferToBuffer(compute, 0, readback, 0, 4);
            checkAbort(signal);
            device.queue.submit([encoder.finish()]);
            await readback.mapAsync(MAP_MODE_READ);
            const result = new Uint32Array(readback.getMappedRange())[0];
            readback.unmap();
            report.computePassRan = result === 1;
            if (!report.computePassRan)
                report.error = "The compute pass ran but returned an unexpected value.";
        } catch (cause) {
            report.error = `The GPU compute check failed: ${message(cause)}`;
            report.limitations.push(
                "The compute pass did not complete, so support is unconfirmed.",
            );
        }
        return {
            ...report,
            errorCode: resultCodeForText(report.error ?? ""),
            limitationCodes: report.limitations.map(resultCodeForText),
        };
    }
}
