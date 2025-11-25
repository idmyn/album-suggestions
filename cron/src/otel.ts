import * as Otlp from "@effect/opentelemetry/Otlp";
import { FetchHttpClient, HttpClient, HttpClientError } from "@effect/platform";
import { Config, Duration, Effect, Layer, Redacted } from "effect";

const makeHeaders = Effect.gen(function* () {
	const apiKey = yield* Config.redacted("HONEYCOMB_API_KEY");
	return {
		"x-honeycomb-team": Redacted.value(apiKey),
	};
});

const OtelEnabled = Config.boolean("OTEL_ENABLED").pipe(
	Config.withDefault(false),
);

// Cloudflare Workers-compatible HttpClient that always consumes response bodies to avoid errors like this:
// A stalled HTTP response was canceled to prevent deadlock. This can happen when a Worker calls fetch() or cache.match() several times without reading the bodies of the returned Response objects
const CloudflareHttpClientLive = Layer.effect(
	HttpClient.HttpClient,
	Effect.gen(function* () {
		const defaultClient = yield* HttpClient.HttpClient;

		return defaultClient.pipe(
			HttpClient.transformResponse((effect) =>
				effect.pipe(
					// Drain response bodies
					Effect.tap((res) =>
						res.arrayBuffer.pipe(
							Effect.ignore,
							Effect.catchAllDefect(() => Effect.void),
						),
					),
					// Cancel bodies on error responses
					Effect.tapError((e) =>
						HttpClientError.isHttpClientError(e) && e._tag === "ResponseError"
							? Effect.sync(() => {
									try {
										(e.response as any).body?.cancel?.();
									} catch {}
								})
							: Effect.void,
					),
				),
			),
		);
	}),
).pipe(Layer.provide(FetchHttpClient.layer));

export const HoneycombLayer = Layer.unwrapEffect(
	Effect.gen(function* () {
		const enabled = yield* OtelEnabled;
		if (!enabled) return Layer.empty;

		const headers = yield* makeHeaders;

		return Otlp.layer({
			baseUrl: "https://api.honeycomb.io",
			resource: { serviceName: "cron-worker" },
			headers,
			maxBatchSize: 512,
			tracerExportInterval: Duration.millis(2000),
			shutdownTimeout: Duration.seconds(3),
		}).pipe(Layer.provide(CloudflareHttpClientLive));
	}),
);
