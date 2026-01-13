import { LibsqlClient } from "@effect/sql-libsql";
import * as SqliteDrizzle from "@effect/sql-drizzle/Sqlite";
import { SqlClient, SqlError } from "@effect/sql";
import { Config, Context, Effect, Layer, Option } from "effect";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import { desc, eq, asc } from "drizzle-orm";
import * as schema from "./schema";
import { nanoid } from "./utils";

type DrizzleDb = SqliteRemoteDatabase<typeof schema>;

export type AlbumSuggestions = {
	createdAt: Date;
	albums: Array<{
		id: string;
		name: string;
		releaseDate: string;
		releaseDatePrecision: "year" | "month" | "day";
		appleMusicUrl: string | null;
		tidalUrl: string | null;
		spotifyUrl: string;
		blurb: string;
		artists: Array<{ id: string; name: string }>;
		images: {
			small: string;
			medium: string;
			large: string;
		};
	}>;
};

export class Database extends Context.Tag("Database")<
	Database,
	{
		insertAiResponse: (data: {
			prompt: string;
			outputSchema: string;
			model: string;
			output: string;
		}) => Effect.Effect<string, SqlError.SqlError>;

		insertWeeklyBatch: (data: {
			weekId: string;
			aiResponseId: string;
			albums: Array<{
				id: string;
				name: string;
				releaseDate: string;
				releaseDatePrecision: "year" | "month" | "day";
				appleMusicUrl?: string;
				tidalUrl?: string;
				spotifyUrl: string;
				blurb: string;
				artists: Array<{ id: string; name: string }>;
				smallImageUrl: string;
				mediumImageUrl: string;
				largeImageUrl: string;
			}>;
		}) => Effect.Effect<void, SqlError.SqlError>;

		getLatestAlbumSuggestions: () => Effect.Effect<
			Option.Option<AlbumSuggestions>,
			SqlError.SqlError
		>;

		getSuggestionsByWeekId: (
			weekId: string,
		) => Effect.Effect<Option.Option<AlbumSuggestions>, SqlError.SqlError>;

		getAllWeekIds: () => Effect.Effect<string[], SqlError.SqlError>;

		getRecentWeekIds: () => Effect.Effect<string[], SqlError.SqlError>;

		getAllSuggestedAlbumIds: () => Effect.Effect<string[], SqlError.SqlError>;
	}
>() {}

const fetchAlbumsForAiResponse = (
	db: DrizzleDb,
	aiResponseId: string,
): Effect.Effect<AlbumSuggestions["albums"], SqlError.SqlError> =>
	Effect.gen(function* () {
		const suggestions = yield* db
			.select({
				blurb: schema.albumSuggestions.blurb,
				spotifyId: schema.albums.spotifyId,
				name: schema.albums.name,
				releaseDate: schema.albums.releaseDate,
				releaseDatePrecision: schema.albums.releaseDatePrecision,
				appleMusicUrl: schema.albums.appleMusicUrl,
				tidalUrl: schema.albums.tidalUrl,
				spotifyUrl: schema.albums.spotifyUrl,
				smallImageUrl: schema.albums.smallImageUrl,
				mediumImageUrl: schema.albums.mediumImageUrl,
				largeImageUrl: schema.albums.largeImageUrl,
			})
			.from(schema.albumSuggestions)
			.innerJoin(
				schema.albums,
				eq(schema.albumSuggestions.albumId, schema.albums.spotifyId),
			)
			.where(eq(schema.albumSuggestions.aiResponseId, aiResponseId));

		const albumIds = suggestions.map((s) => s.spotifyId);
		if (albumIds.length === 0) return [];

		const albumArtists = yield* db
			.select({
				albumId: schema.albumArtists.albumId,
				artistId: schema.artists.spotifyId,
				artistName: schema.artists.name,
			})
			.from(schema.albumArtists)
			.innerJoin(
				schema.artists,
				eq(schema.albumArtists.artistId, schema.artists.spotifyId),
			);

		const artistsByAlbum = new Map<
			string,
			Array<{ id: string; name: string }>
		>();
		for (const aa of albumArtists) {
			if (!albumIds.includes(aa.albumId)) continue;
			if (!artistsByAlbum.has(aa.albumId)) {
				artistsByAlbum.set(aa.albumId, []);
			}
			artistsByAlbum.get(aa.albumId)!.push({
				id: aa.artistId,
				name: aa.artistName,
			});
		}

		return suggestions.map((s) => ({
			id: s.spotifyId,
			name: s.name,
			releaseDate: s.releaseDate,
			releaseDatePrecision: s.releaseDatePrecision as "year" | "month" | "day",
			appleMusicUrl: s.appleMusicUrl,
			tidalUrl: s.tidalUrl,
			spotifyUrl: s.spotifyUrl,
			blurb: s.blurb,
			artists: artistsByAlbum.get(s.spotifyId) ?? [],
			images: {
				small: s.smallImageUrl,
				medium: s.mediumImageUrl,
				large: s.largeImageUrl,
			},
		}));
	});

export const makeDatabaseImpl = (
	db: DrizzleDb,
	sql: SqlClient.SqlClient,
): Context.Tag.Service<Database> => ({
	insertAiResponse: Effect.fn("db.insertAiResponse")(function* (data) {
		const id = nanoid();
		yield* db.insert(schema.aiResponses).values({
			id,
			prompt: data.prompt,
			outputSchema: data.outputSchema,
			model: data.model,
			output: data.output,
			createdAt: new Date(),
		});
		return id;
	}),

	insertWeeklyBatch: Effect.fn("db.insertWeeklyBatch")(function* (data) {
		yield* sql.withTransaction(
			Effect.gen(function* () {
				yield* db
					.insert(schema.weeklyBatches)
					.values({
						weekId: data.weekId,
						aiResponseId: data.aiResponseId,
						createdAt: new Date(),
					})
					.onConflictDoUpdate({
						target: schema.weeklyBatches.weekId,
						set: { aiResponseId: data.aiResponseId },
					});

				const allArtists = data.albums.flatMap((album) =>
					album.artists.map((artist) => ({
						spotifyId: artist.id,
						name: artist.name,
					})),
				);

				if (allArtists.length > 0) {
					yield* db
						.insert(schema.artists)
						.values(allArtists)
						.onConflictDoNothing();
				}

				yield* db
					.insert(schema.albums)
					.values(
						data.albums.map((album) => ({
							spotifyId: album.id,
							name: album.name,
							releaseDate: album.releaseDate,
							releaseDatePrecision: album.releaseDatePrecision,
							appleMusicUrl: album.appleMusicUrl ?? null,
							tidalUrl: album.tidalUrl ?? null,
							spotifyUrl: album.spotifyUrl,
							smallImageUrl: album.smallImageUrl,
							mediumImageUrl: album.mediumImageUrl,
							largeImageUrl: album.largeImageUrl,
						})),
					)
					.onConflictDoNothing();

				const albumArtistPairs = data.albums.flatMap((album) =>
					album.artists.map((artist) => ({
						albumId: album.id,
						artistId: artist.id,
					})),
				);

				if (albumArtistPairs.length > 0) {
					yield* db
						.insert(schema.albumArtists)
						.values(albumArtistPairs)
						.onConflictDoNothing();
				}

				yield* db.insert(schema.albumSuggestions).values(
					data.albums.map((album) => ({
						id: nanoid(),
						aiResponseId: data.aiResponseId,
						albumId: album.id,
						blurb: album.blurb,
						createdAt: new Date(),
					})),
				);
			}),
		);
	}),

	getLatestAlbumSuggestions: Effect.fn("db.getLatestAlbumSuggestions")(
		function* () {
			const [latestResponse] = yield* db
				.select({
					id: schema.aiResponses.id,
					createdAt: schema.aiResponses.createdAt,
				})
				.from(schema.aiResponses)
				.orderBy(desc(schema.aiResponses.createdAt))
				.limit(1);

			if (!latestResponse) return Option.none();

			const albums = yield* fetchAlbumsForAiResponse(db, latestResponse.id);

			return Option.some({
				createdAt: latestResponse.createdAt,
				albums,
			});
		},
	),

	getSuggestionsByWeekId: Effect.fn("db.getSuggestionsByWeekId")(
		function* (weekId) {
			const [batch] = yield* db
				.select({
					aiResponseId: schema.weeklyBatches.aiResponseId,
				})
				.from(schema.weeklyBatches)
				.where(eq(schema.weeklyBatches.weekId, weekId))
				.limit(1);

			if (!batch) return Option.none();

			const [aiResponse] = yield* db
				.select({
					id: schema.aiResponses.id,
					createdAt: schema.aiResponses.createdAt,
				})
				.from(schema.aiResponses)
				.where(eq(schema.aiResponses.id, batch.aiResponseId))
				.limit(1);

			if (!aiResponse) return Option.none();

			const albums = yield* fetchAlbumsForAiResponse(db, aiResponse.id);

			return Option.some({
				createdAt: aiResponse.createdAt,
				albums,
			});
		},
	),

	getAllWeekIds: Effect.fn("db.getAllWeekIds")(function* () {
		const data = yield* db
			.select({ weekId: schema.weeklyBatches.weekId })
			.from(schema.weeklyBatches)
			.orderBy(asc(schema.weeklyBatches.weekId));

		return data.map((row) => row.weekId);
	}),

	getRecentWeekIds: Effect.fn("db.getRecentWeekIds")(function* () {
		const data = yield* db
			.select({ weekId: schema.weeklyBatches.weekId })
			.from(schema.weeklyBatches)
			.orderBy(desc(schema.weeklyBatches.createdAt))
			.limit(10);

		return data.map((row) => row.weekId);
	}),

	getAllSuggestedAlbumIds: Effect.fn("db.getAllSuggestedAlbumIds")(
		function* () {
			const data = yield* db
				.select({ albumId: schema.albumSuggestions.albumId })
				.from(schema.albumSuggestions);

			return data.map((row) => row.albumId);
		},
	),
});

export const LibsqlLive = LibsqlClient.layerConfig({
	url: Config.string("TURSO_DATABASE_URL"),
	authToken: Config.redacted("TURSO_AUTH_TOKEN"),
});

export const DatabaseLive = Layer.effect(
	Database,
	Effect.gen(function* () {
		const db = yield* SqliteDrizzle.make({ schema });
		const sql = yield* SqlClient.SqlClient;
		return makeDatabaseImpl(db, sql);
	}),
).pipe(Layer.provide(LibsqlLive));
