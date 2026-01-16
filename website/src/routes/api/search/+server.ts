import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { EmbeddingService, EmbeddingServiceLive, LibsqlLive } from "shared";
import { SqlClient } from "@effect/sql";
import { Effect, Layer } from "effect";

type SearchResult = {
	id: string;
	name: string;
	blurb: string;
	spotifyUrl: string;
	appleMusicUrl: string | null;
	tidalUrl: string | null;
	mediumImageUrl: string;
	artists: { name: string }[];
	distance: number;
};

const SearchLayer = Layer.merge(EmbeddingServiceLive, LibsqlLive);

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get("q");

	if (!query || query.trim().length === 0) {
		return json({ albums: [], query: "" });
	}

	const trimmedQuery = query.trim();

	const result = await Effect.gen(function* () {
		const embeddingService = yield* EmbeddingService;
		const sql = yield* SqlClient.SqlClient;

		const queryEmbedding =
			yield* embeddingService.generateEmbedding(trimmedQuery);

		const rows = yield* sql<{
			id: string;
			name: string;
			blurb: string;
			spotifyUrl: string;
			appleMusicUrl: string | null;
			tidalUrl: string | null;
			mediumImageUrl: string;
			artistNames: string;
			distance: number;
		}>`
			SELECT
				a.spotifyId as id,
				a.name,
				s.blurb,
				a.spotifyUrl,
				a.appleMusicUrl,
				a.tidalUrl,
				a.mediumImageUrl,
				GROUP_CONCAT(ar.name, ', ') as artistNames,
				vector_distance_cos(s.blurb_embedding, vector32(${JSON.stringify(queryEmbedding)})) as distance
			FROM album_suggestions s
			JOIN albums a ON s.albumId = a.spotifyId
			LEFT JOIN album_artists aa ON a.spotifyId = aa.albumId
			LEFT JOIN artists ar ON aa.artistId = ar.spotifyId
			WHERE s.blurb_embedding IS NOT NULL
			GROUP BY a.spotifyId
			ORDER BY distance ASC
			LIMIT 10
		`;

		const albums: SearchResult[] = rows.map((row) => ({
			id: row.id,
			name: row.name,
			blurb: row.blurb,
			spotifyUrl: row.spotifyUrl,
			appleMusicUrl: row.appleMusicUrl,
			tidalUrl: row.tidalUrl,
			mediumImageUrl: row.mediumImageUrl,
			artists: row.artistNames
				? row.artistNames.split(", ").map((name) => ({ name }))
				: [],
			distance: row.distance,
		}));

		return { albums, query: trimmedQuery };
	}).pipe(Effect.provide(SearchLayer), Effect.runPromise);

	return json(result);
};
