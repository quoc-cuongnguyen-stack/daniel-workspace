import * as opentelemetry from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import process from 'node:process';

// Configure service name for easy identification on Jaeger
process.env['OTEL_SERVICE_NAME'] = 'ssl-be-local';

const traceExporter = new OTLPTraceExporter({
    url: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] || 'http://localhost:4318/v1/traces',
});

const sdk = new opentelemetry.NodeSDK({
    traceExporter,
    instrumentations: [
        getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': {
                enabled: false,
            },
        }),
    ],
});

sdk.start();

console.log('🚀 [Local Tracing] OpenTelemetry Instrumentation Started (Exporting to OTLP)');

process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('🛑 [Local Tracing] OpenTelemetry terminated'))
        .catch((error) => console.error('🛑 [Local Tracing] Error terminating OpenTelemetry', error))
        .finally(() => process.exit(0));
});
