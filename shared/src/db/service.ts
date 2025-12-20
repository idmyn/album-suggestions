import { createClient } from "@libsql/client";
import { Config, Context, Data, Effect, Layer, Option } from "effect";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "./schema";
import { nanoid } from "./utils";

type DrizzleDb = BaseSQLiteDatabase<"async", unknown, typeof schema>;

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
	cause: unknown;
}> {}

const mapAlbumSuggestions = (
	albumSuggestions: Array<{
		blurb: string;
		albums: {
			spotifyId: string;
			name: string;
			releaseDate: string;
			releaseDatePrecision: "year" | "month" | "day";
			appleMusicUrl: string | null;
			tidalUrl: string | null;
			spotifyUrl: string;
			smallImageUrl: string;
			mediumImageUrl: string;
			largeImageUrl: string;
			albumArtists: Array<{
				artist: {
					spotifyId: string;
					name: string;
				};
			}>;
		};
	}>,
): AlbumSuggestions["albums"] =>
	albumSuggestions.map((albumSuggestion) => ({
		id: albumSuggestion.albums.spotifyId,
		name: albumSuggestion.albums.name,
		releaseDate: albumSuggestion.albums.releaseDate,
		releaseDatePrecision: albumSuggestion.albums.releaseDatePrecision,
		appleMusicUrl: albumSuggestion.albums.appleMusicUrl,
		tidalUrl: albumSuggestion.albums.tidalUrl,
		spotifyUrl: albumSuggestion.albums.spotifyUrl,
		blurb: albumSuggestion.blurb,
		artists: albumSuggestion.albums.albumArtists.map((albumArtist) => ({
			id: albumArtist.artist.spotifyId,
			name: albumArtist.artist.name,
		})),
		images: {
			small: albumSuggestion.albums.smallImageUrl,
			medium: albumSuggestion.albums.mediumImageUrl,
			large: albumSuggestion.albums.largeImageUrl,
		},
	}));

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
		}) => Effect.Effect<string, DatabaseError>;

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
		}) => Effect.Effect<void, DatabaseError>;

		getLatestAlbumSuggestions: () => Effect.Effect<
			Option.Option<AlbumSuggestions>,
			DatabaseError
		>;

		getSuggestionsByWeekId: (
			weekId: string,
		) => Effect.Effect<Option.Option<AlbumSuggestions>, DatabaseError>;

		getAllWeekIds: () => Effect.Effect<string[], DatabaseError>;

		getRecentWeekIds: () => Effect.Effect<string[], DatabaseError>;
	}
>() {}

export const makeDatabaseImpl = (db: DrizzleDb): Context.Tag.Service<Database> => ({
	insertAiResponse: Effect.fn("db.insertAiResponse")(function* (data) {
		const id = nanoid();
		yield* Effect.tryPromise({
			try: () =>
				db.insert(schema.aiResponses).values({
					id,
					prompt: data.prompt,
					outputSchema: data.outputSchema,
					model: data.model,
					output: data.output,
					createdAt: new Date(),
				}),
			catch: (cause) => new DatabaseError({ cause }),
		});
		return id;
	}),

	insertWeeklyBatch: Effect.fn("db.insertWeeklyBatch")(function* (data) {
		yield* Effect.tryPromise({
			try: () =>
				db.transaction(async (tx) => {
					await tx
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
						await tx
							.insert(schema.artists)
							.values(allArtists)
							.onConflictDoNothing();
					}

					await tx
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
						await tx
							.insert(schema.albumArtists)
							.values(albumArtistPairs)
							.onConflictDoNothing();
					}

					await tx.insert(schema.albumSuggestions).values(
						data.albums.map((album) => ({
							id: nanoid(),
							aiResponseId: data.aiResponseId,
							albumId: album.id,
							blurb: album.blurb,
							createdAt: new Date(),
						})),
					);
				}),
			catch: (cause) => new DatabaseError({ cause }),
		});
	}),

	getLatestAlbumSuggestions: Effect.fn("db.getLatestAlbumSuggestions")(
		function* () {
			return yield* Effect.tryPromise({
				try: async () => {
					const data = await db.query.aiResponses.findFirst({
						orderBy: (aiResponses, { desc }) => [
							desc(aiResponses.createdAt),
						],
						with: {
							albumSuggestions: {
								with: {
									albums: {
										with: {
											albumArtists: {
												with: {
													artist: true,
												},
											},
										},
									},
								},
							},
						},
					});

					if (!data) return Option.none();

					return Option.some({
						createdAt: data.createdAt,
						albums: mapAlbumSuggestions(data.albumSuggestions),
					});
				},
				catch: (cause) => new DatabaseError({ cause }),
			});
		},
	),

	getSuggestionsByWeekId: Effect.fn("db.getSuggestionsByWeekId")(
		function* (weekId) {
			return yield* Effect.tryPromise({
				try: async () => {
					const data = await db.query.weeklyBatches.findFirst({
						where: (weeklyBatches, { eq }) =>
							eq(weeklyBatches.weekId, weekId),
						with: {
							aiResponse: {
								with: {
									albumSuggestions: {
										with: {
											albums: {
												with: {
													albumArtists: {
														with: {
															artist: true,
														},
													},
												},
											},
										},
									},
								},
							},
						},
					});

					if (!data) return Option.none();

					return Option.some({
						createdAt: data.aiResponse.createdAt,
						albums: mapAlbumSuggestions(data.aiResponse.albumSuggestions),
					});
				},
				catch: (cause) => new DatabaseError({ cause }),
			});
		},
	),

	getAllWeekIds: Effect.fn("db.getAllWeekIds")(function* () {
		return yield* Effect.tryPromise({
			try: async () => {
				const data = await db.query.weeklyBatches.findMany({
					orderBy: (weeklyBatches, { asc }) => [asc(weeklyBatches.weekId)],
					columns: {
						weekId: true,
					},
				});

				return data.map((row) => row.weekId);
			},
			catch: (cause) => new DatabaseError({ cause }),
		});
	}),

	getRecentWeekIds: Effect.fn("db.getRecentWeekIds")(function* () {
		return yield* Effect.tryPromise({
			try: async () => {
				const data = await db.query.weeklyBatches.findMany({
					orderBy: (weeklyBatches, { desc }) => [
						desc(weeklyBatches.createdAt),
					],
					limit: 10,
					columns: {
						weekId: true,
					},
				});

				return data.map((row) => row.weekId);
			},
			catch: (cause) => new DatabaseError({ cause }),
		});
	}),
});

export const DatabaseLive = Layer.effect(
	Database,
	Effect.gen(function* () {
		const url = yield* Config.string("TURSO_DATABASE_URL");
		const authToken = yield* Config.string("TURSO_AUTH_TOKEN");

		const client = createClient({ url, authToken });
		const db = drizzle(client, { schema });

		return makeDatabaseImpl(db);
	}),
);
