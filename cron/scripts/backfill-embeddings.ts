import { FetchHttpClient } from "@effect/platform";
import { SqlClient } from "@effect/sql";
import { Console, Effect, Layer } from "effect";
import {
	EmbeddingService,
	EmbeddingServiceLive,
	floatArrayToBlob,
	LibsqlLive,
} from "shared";

const BATCH_SIZE = 50;

const program = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	const embeddingService = yield* EmbeddingService;

	yield* Console.log("=== Backfill Embeddings ===\n");

	const albums = yield* sql<{
		id: string;
		blurb: string;
		albumName: string;
	}>`SELECT s.id, s.blurb, a.name as albumName
	   FROM album_suggestions s
	   JOIN albums a ON s.albumId = a.spotifyId
	   WHERE s.blurb_embedding IS NULL`;

	yield* Console.log(`Found ${albums.length} albums missing embeddings\n`);

	if (albums.length === 0) {
		yield* Console.log("Nothing to backfill.");
		return;
	}

	for (let i = 0; i < albums.length; i += BATCH_SIZE) {
		const batch = albums.slice(i, i + BATCH_SIZE);
		const batchNum = Math.floor(i / BATCH_SIZE) + 1;
		const totalBatches = Math.ceil(albums.length / BATCH_SIZE);

		yield* Console.log(
			`Processing batch ${batchNum}/${totalBatches} (${batch.length} albums)...`,
		);

		const blurbs = batch.map((a) => a.blurb);
		const embeddings = yield* embeddingService.generateEmbeddings(blurbs);

		for (let j = 0; j < batch.length; j++) {
			const album = batch[j]!;
			const embedding = embeddings[j];
			if (embedding) {
				const embeddingBlob = floatArrayToBlob(embedding);
				yield* sql`UPDATE album_suggestions SET blurb_embedding = ${embeddingBlob} WHERE id = ${album.id}`;
			}
		}

		yield* Console.log(`  ✓ Updated ${batch.length} albums`);
	}

	yield* Console.log(`\n=== Backfill Complete ===`);
	yield* Console.log(`Updated ${albums.length} albums with embeddings.`);
});

const MainLayer = Layer.mergeAll(
	LibsqlLive,
	EmbeddingServiceLive.pipe(Layer.provide(FetchHttpClient.layer)),
);

const run = async () => {
	await Effect.runPromise(
		program.pipe(Effect.provide(MainLayer), Effect.catchAll(Console.error)),
	);
};

run();
