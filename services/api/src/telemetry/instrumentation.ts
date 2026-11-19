import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";

let sdk: NodeSDK | null = null;

/** Starts OpenTelemetry only when an OTLP endpoint is configured; no endpoint is hardcoded. */
export function startInstrumentation(): void {
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (!endpoint || sdk) return;

    sdk = new NodeSDK({
        traceExporter: new OTLPTraceExporter({ url: endpoint }),
        instrumentations: [getNodeAutoInstrumentations()],
    });
    sdk.start();
}

startInstrumentation();
