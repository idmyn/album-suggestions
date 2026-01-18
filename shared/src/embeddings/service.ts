import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import { Config, Context, Effect, Layer, Redacted, Schema } from "effect";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

const EmbeddingResponse = Schema.Struct({
	data: Schema.Array(
		Schema.Struct({
			embedding: Schema.Array(Schema.Number),
			index: Schema.Number,
		}),
	),
	model: Schema.String,
});

export class EmbeddingService extends Context.Tag("EmbeddingService")<
	EmbeddingService,
	{
		generateEmbedding: (text: string) => Effect.Effect<number[], Error, never>;
		generateEmbeddings: (
			texts: string[],
		) => Effect.Effect<number[][], Error, never>;
	}
>() {}

const makeEmbeddingRequest = (
	input: string | string[],
	apiKey: Redacted.Redacted,
	client: HttpClient.HttpClient,
) =>
	HttpClientRequest.post("https://openrouter.ai/api/v1/embeddings").pipe(
		HttpClientRequest.setHeader(
			"Authorization",
			`Bearer ${Redacted.value(apiKey)}`,
		),
		HttpClientRequest.bodyJson({
			input,
			model: EMBEDDING_MODEL,
			dimensions: EMBEDDING_DIMENSIONS,
		}),
		Effect.flatMap(client.execute),
		Effect.flatMap((r) => r.json),
		Effect.scoped,
		Effect.flatMap(Schema.decodeUnknown(EmbeddingResponse)),
		Effect.mapError((e) => new Error(`Embedding API error: ${String(e)}`)),
	);

export const EmbeddingServiceLive = Layer.effect(
	EmbeddingService,
	Effect.gen(function* () {
		const apiKey = yield* Config.redacted("OPENROUTER_API_KEY");
		const client = yield* HttpClient.HttpClient;

		return {
			generateEmbedding: (text: string) =>
				Effect.gen(function* () {
					const response = yield* makeEmbeddingRequest(text, apiKey, client);
					const firstData = response.data[0];
					if (!firstData) {
						return yield* Effect.fail(
							new Error("No embedding data returned from API"),
						);
					}
					return [...firstData.embedding];
				}),

			generateEmbeddings: (texts: string[]) =>
				Effect.gen(function* () {
					if (texts.length === 0) return [];
					const response = yield* makeEmbeddingRequest(texts, apiKey, client);
					const sorted = [...response.data].sort((a, b) => a.index - b.index);
					return sorted.map((d) => [...d.embedding]);
				}),
		};
	}),
).pipe(Layer.provide(FetchHttpClient.layer));

export const floatArrayToBlob = (arr: readonly number[]): Uint8Array => {
	const buffer = new Float32Array(arr);
	return new Uint8Array(buffer.buffer);
};
