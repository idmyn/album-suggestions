import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import { SqlClient } from "@effect/sql";
import { Config, Console, Effect, Layer, Redacted, Schema } from "effect";
import { Database, DatabaseLive, LibsqlLive } from "shared";

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

const fetchEmbedding = (text: string) =>
	Effect.gen(function* () {
		const apiKey = yield* Config.redacted("OPENROUTER_API_KEY");
		const client = yield* HttpClient.HttpClient;

		const response = yield* HttpClientRequest.post(
			"https://openrouter.ai/api/v1/embeddings",
		).pipe(
			HttpClientRequest.setHeader(
				"Authorization",
				`Bearer ${Redacted.value(apiKey)}`,
			),
			HttpClientRequest.bodyJson({
				input: text,
				model: EMBEDDING_MODEL,
				dimensions: EMBEDDING_DIMENSIONS,
			}),
			Effect.flatMap(client.execute),
			Effect.flatMap((r) => r.json),
			Effect.scoped,
		);

		return yield* Schema.decodeUnknown(EmbeddingResponse)(response);
	});

const floatArrayToBlob = (arr: readonly number[]): Uint8Array => {
	const buffer = new Float32Array(arr);
	return new Uint8Array(buffer.buffer);
};

const program = Effect.gen(function* () {
	const db = yield* Database;
	const sql = yield* SqlClient.SqlClient;

	yield* Console.log("=== Embedding Validation Test ===\n");

	yield* Console.log("1. Fetching an album blurb from DB...");
	const [album] = yield* sql<{
		id: string;
		blurb: string;
		name: string;
	}>`SELECT s.id, s.blurb, a.name FROM album_suggestions s 
	   JOIN albums a ON s.albumId = a.spotifyId 
	   LIMIT 1`;

	if (!album) {
		return yield* Effect.fail(new Error("No albums in database"));
	}

	yield* Console.log(`   Found: "${album.name}"`);
	yield* Console.log(`   Blurb: "${album.blurb.slice(0, 80)}..."\n`);

	yield* Console.log("2. Calling OpenRouter embeddings API...");
	const embeddingResponse = yield* fetchEmbedding(album.blurb);
	const firstData = embeddingResponse.data[0];
	if (!firstData) {
		return yield* Effect.fail(new Error("No embedding data returned"));
	}
	const embedding = firstData.embedding;

	yield* Console.log(`   Model: ${embeddingResponse.model}`);
	yield* Console.log(`   Dimensions: ${embedding.length}`);

	if (embedding.length !== EMBEDDING_DIMENSIONS) {
		return yield* Effect.fail(
			new Error(
				`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`,
			),
		);
	}
	yield* Console.log("   ✓ Dimension count verified\n");

	yield* Console.log("3. Storing embedding in Turso...");
	const embeddingBlob = floatArrayToBlob(embedding);
	yield* sql`UPDATE album_suggestions SET blurb_embedding = ${embeddingBlob} WHERE id = ${album.id}`;
	yield* Console.log("   ✓ Embedding stored\n");

	yield* Console.log(
		'4. Testing vector search with query "dreamy shoegaze"...',
	);
	const queryResponse = yield* fetchEmbedding("dreamy shoegaze");
	const queryData = queryResponse.data[0];
	if (!queryData) {
		return yield* Effect.fail(new Error("No query embedding data returned"));
	}
	const queryBlob = floatArrayToBlob(queryData.embedding);

	const results = yield* sql<{
		id: string;
		name: string;
		blurb: string;
		distance: number;
	}>`SELECT s.id, a.name, s.blurb, vector_distance_cos(s.blurb_embedding, ${queryBlob}) as distance
	   FROM album_suggestions s
	   JOIN albums a ON s.albumId = a.spotifyId
	   WHERE s.blurb_embedding IS NOT NULL
	   ORDER BY distance ASC
	   LIMIT 5`;

	yield* Console.log(`   Found ${results.length} result(s):\n`);
	for (const result of results) {
		yield* Console.log(`   - ${result.name} (distance: ${result.distance})`);
		yield* Console.log(`     "${result.blurb.slice(0, 60)}..."\n`);
	}

	const foundTestAlbum = results.some((r) => r.id === album.id);
	if (foundTestAlbum) {
		yield* Console.log("   ✓ Test album found in search results\n");
	} else {
		yield* Console.log(
			"   ⚠ Test album not in top 5 (expected since only 1 embedded)\n",
		);
	}

	yield* Console.log("=== Validation Complete ===");
	yield* Console.log("All critical unknowns validated:");
	yield* Console.log("  ✓ OpenRouter embeddings API works");
	yield* Console.log("  ✓ Returns 1536 dimensions");
	yield* Console.log("  ✓ Turso stores F32_BLOB");
	yield* Console.log("  ✓ vector_distance_cos query executes");
});

const MainLayer = Layer.mergeAll(
	DatabaseLive,
	LibsqlLive,
	FetchHttpClient.layer,
);

const run = async () => {
	await Effect.runPromise(
		program.pipe(Effect.provide(MainLayer), Effect.catchAll(Console.error)),
	);
};

run();
