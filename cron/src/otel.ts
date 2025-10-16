import * as Otlp from "@effect/opentelemetry/Otlp";
import { FetchHttpClient } from "@effect/platform";
import { Config, Duration, Effect, Layer, Redacted } from "effect";

const makeHeaders = Effect.gen(function* () {
  const apiKey = yield* Config.redacted("HONEYCOMB_API_KEY");
  const dataset = yield* Config.string("HONEYCOMB_DATASET");
  return {
    "x-honeycomb-team": Redacted.value(apiKey),
    "x-honeycomb-dataset": dataset,
  };
});

const makeServiceName = Config.string("SERVICE_NAME").pipe(
  Config.withDefault("david-place-cron"),
);

const OtelEnabled = Config.boolean("OTEL_ENABLED").pipe(
  Config.withDefault(false),
);

export const HoneycombLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const enabled = yield* OtelEnabled;
    if (!enabled) return Layer.empty;

    const [headers, serviceName] = yield* Effect.all([
      makeHeaders,
      makeServiceName,
    ]);
    return Otlp.layer({
      baseUrl: "https://api.honeycomb.io",
      resource: { serviceName },
      headers,
      maxBatchSize: 256,
      tracerExportInterval: Duration.millis(200),
      shutdownTimeout: Duration.seconds(3),
    }).pipe(Layer.provide(FetchHttpClient.layer));
  }),
);
