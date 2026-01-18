import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
	Database,
	DatabaseLive,
	EmbeddingService,
	EmbeddingServiceLive,
} from "shared";
import { Effect, Layer } from "effect";

const SearchLayer = Layer.merge(EmbeddingServiceLive, DatabaseLive);

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get("q");

	if (!query || query.trim().length === 0) {
		return json({ albums: [], query: "" });
	}

	const trimmedQuery = query.trim();

	const result = await Effect.gen(function* () {
		const embeddingService = yield* EmbeddingService;
		const db = yield* Database;

		const queryEmbedding =
			yield* embeddingService.generateEmbedding(trimmedQuery);

		const albums = yield* db.searchAlbumsByEmbedding(queryEmbedding);

		return { albums, query: trimmedQuery };
	}).pipe(Effect.provide(SearchLayer), Effect.runPromise);

	return json(result);
};
