import { describe, test, expect } from "bun:test";
import { Effect, Layer, ManagedRuntime, Option, Stream } from "effect";

const makeDisposableRuntime = <R, E>(layer: Layer.Layer<R, E>) => {
	const runtime = ManagedRuntime.make(layer);
	return Object.assign(runtime, {
		[Symbol.asyncDispose]: () => runtime.dispose(),
	});
};
import { program } from "./main";
import { AiService, type Album } from "./askForAlbums";
import { SpotifyService, type SpotifyAlbumWithBlurb } from "./spotify";
import { SongLinkService, type SongLinks } from "./songLink";
import { Database, currentSuggestionWeekId } from "shared";
import { DatabaseTestLive } from "./testUtils";

const makeAlbum = (id: string): Album => ({
	title: `Album ${id}`,
	artist: `Artist ${id}`,
	blurb: `Blurb for ${id}`,
	genres: ["pop"],
});

const makeSpotifyAlbum = (id: string): SpotifyAlbumWithBlurb => ({
	id,
	name: `Album ${id}`,
	spotifyUrl: `https://open.spotify.com/album/${id}`,
	releaseDate: "2025-01-01",
	releaseDatePrecision: "day",
	images: {
		smallImageUrl: `https://img.spotify.com/${id}/small.jpg`,
		mediumImageUrl: `https://img.spotify.com/${id}/medium.jpg`,
		largeImageUrl: `https://img.spotify.com/${id}/large.jpg`,
	},
	artists: [{ id: `artist-${id}`, name: `Artist ${id}` }],
	blurb: `Blurb for ${id}`,
});

const makeSongLinks = (id: string): SongLinks => ({
	entityUniqueId: `SPOTIFY_ALBUM::${id}`,
	userCountry: "US",
	pageUrl: `https://song.link/${id}`,
	linksByPlatform: {
		spotify: {
			country: "US",
			url: `https://open.spotify.com/album/${id}`,
			entityUniqueId: `SPOTIFY_ALBUM::${id}`,
		},
		appleMusic: {
			country: "US",
			url: `https://music.apple.com/album/${id}`,
			entityUniqueId: `APPLE_MUSIC::${id}`,
		},
		tidal: {
			country: "US",
			url: `https://tidal.com/album/${id}`,
			entityUniqueId: `TIDAL::${id}`,
		},
	},
});

describe("cron program", () => {
	test("happy path: fetches 5+ albums on first attempt, no retry needed", async () => {
		const albumIds = ["a1", "a2", "a3", "a4", "a5"];
		const albums = albumIds.map(makeAlbum);
		const spotifyAlbums = albumIds.map(makeSpotifyAlbum);

		const TestAiService = Layer.effect(
			AiService,
			Effect.gen(function* () {
				const db = yield* Database;
				return {
					askForAlbums: () =>
						Effect.gen(function* () {
							const aiResponseId = yield* db.insertAiResponse({
								prompt: "test prompt",
								outputSchema: "test schema",
								model: "test-model",
								output: JSON.stringify({ albums }),
							});
							return { aiResponseId, albums };
						}),
				};
			}),
		);

		const TestSpotifyService = Layer.succeed(SpotifyService, {
			searchForAlbums: () =>
				Effect.succeed(Stream.fromIterable(spotifyAlbums.map(Option.some))),
		});

		const TestSongLinkService = Layer.succeed(SongLinkService, {
			getLinks: (url: string) => {
				const id = url.split("/").pop()!;
				return Effect.succeed(makeSongLinks(id));
			},
		});

		const TestLayer = Layer.mergeAll(
			TestAiService.pipe(Layer.provide(DatabaseTestLive)),
			TestSpotifyService,
			TestSongLinkService,
			DatabaseTestLive,
		);

		await using runtime = makeDisposableRuntime(TestLayer);

		await runtime.runPromise(program);

		const result = await runtime.runPromise(
			Effect.gen(function* () {
				const db = yield* Database;
				return yield* db.getLatestAlbumSuggestions();
			}),
		);

		expect(Option.isSome(result)).toBe(true);
		if (Option.isSome(result)) {
			expect(result.value.albums).toHaveLength(5);
			expect(result.value.albums.map((a) => a.id).sort()).toEqual(
				albumIds.sort(),
			);
		}
	});

	test("retries and accumulates unique albums, deduplicates within and across attempts", async () => {
		const attemptCounter = { count: 0 };

		const TestAiService = Layer.effect(
			AiService,
			Effect.gen(function* () {
				const db = yield* Database;
				return {
					askForAlbums: () =>
						Effect.gen(function* () {
							attemptCounter.count++;
							const albumsForAttempt =
								attemptCounter.count === 1
									? [makeAlbum("a1"), makeAlbum("a2"), makeAlbum("a1")] // 2 unique, 1 duplicate
									: [
											makeAlbum("a2"),
											makeAlbum("a3"),
											makeAlbum("a4"),
											makeAlbum("a5"),
										]; // a2 is cross-attempt duplicate

							const aiResponseId = yield* db.insertAiResponse({
								prompt: "test prompt",
								outputSchema: "test schema",
								model: "test-model",
								output: JSON.stringify({ albums: albumsForAttempt }),
							});
							return { aiResponseId, albums: albumsForAttempt };
						}),
				};
			}),
		);

		const TestSpotifyService = Layer.succeed(SpotifyService, {
			searchForAlbums: (albums: readonly Album[]) =>
				Effect.succeed(
					Stream.fromIterable(
						albums.map((a) =>
							Option.some(makeSpotifyAlbum(a.title.split(" ")[1]!)),
						),
					),
				),
		});

		const TestSongLinkService = Layer.succeed(SongLinkService, {
			getLinks: (url: string) => {
				const id = url.split("/").pop()!;
				return Effect.succeed(makeSongLinks(id));
			},
		});

		const TestLayer = Layer.mergeAll(
			TestAiService.pipe(Layer.provide(DatabaseTestLive)),
			TestSpotifyService,
			TestSongLinkService,
			DatabaseTestLive,
		);

		await using runtime = makeDisposableRuntime(TestLayer);

		await runtime.runPromise(program);

		const result = await runtime.runPromise(
			Effect.gen(function* () {
				const db = yield* Database;
				return yield* db.getSuggestionsByWeekId(currentSuggestionWeekId());
			}),
		);

		expect(attemptCounter.count).toBe(2);
		expect(Option.isSome(result)).toBe(true);
		if (Option.isSome(result)) {
			// Attempt 1: a1, a2 (a1 duplicate ignored) = 2 unique
			// Attempt 2: a3, a4, a5 (a2 cross-attempt duplicate filtered) = 3 unique
			// Total: 5 unique albums
			expect(result.value.albums).toHaveLength(5);
			expect(result.value.albums.map((a) => a.id).sort()).toEqual([
				"a1",
				"a2",
				"a3",
				"a4",
				"a5",
			]);
		}
	});

	test("filters out already-suggested albums from database", async () => {
		const TestAiService = Layer.effect(
			AiService,
			Effect.gen(function* () {
				const db = yield* Database;
				return {
					askForAlbums: () =>
						Effect.gen(function* () {
							const albums = [
								makeAlbum("existing1"),
								makeAlbum("existing2"),
								makeAlbum("new1"),
								makeAlbum("new2"),
								makeAlbum("new3"),
								makeAlbum("new4"),
								makeAlbum("new5"),
							];
							const aiResponseId = yield* db.insertAiResponse({
								prompt: "test prompt",
								outputSchema: "test schema",
								model: "test-model",
								output: JSON.stringify({ albums }),
							});
							return { aiResponseId, albums };
						}),
				};
			}),
		);

		const TestSpotifyService = Layer.succeed(SpotifyService, {
			searchForAlbums: (albums: readonly Album[]) =>
				Effect.succeed(
					Stream.fromIterable(
						albums.map((a) =>
							Option.some(makeSpotifyAlbum(a.title.split(" ")[1]!)),
						),
					),
				),
		});

		const TestSongLinkService = Layer.succeed(SongLinkService, {
			getLinks: (url: string) => {
				const id = url.split("/").pop()!;
				return Effect.succeed(makeSongLinks(id));
			},
		});

		const TestLayer = Layer.mergeAll(
			TestAiService.pipe(Layer.provide(DatabaseTestLive)),
			TestSpotifyService,
			TestSongLinkService,
			DatabaseTestLive,
		);

		await using runtime = makeDisposableRuntime(TestLayer);

		// Pre-populate database with existing albums
		await runtime.runPromise(
			Effect.gen(function* () {
				const db = yield* Database;
				const aiResponseId = yield* db.insertAiResponse({
					prompt: "old prompt",
					outputSchema: "old schema",
					model: "old-model",
					output: "{}",
				});
				yield* db.insertWeeklyBatch({
					weekId: "2024W01",
					aiResponseId,
					albums: ["existing1", "existing2"].map((id) => ({
						id,
						name: `Album ${id}`,
						releaseDate: "2024-01-01",
						releaseDatePrecision: "day" as const,
						spotifyUrl: `https://open.spotify.com/album/${id}`,
						blurb: `Old blurb for ${id}`,
						artists: [{ id: `artist-${id}`, name: `Artist ${id}` }],
						smallImageUrl: `https://img.spotify.com/${id}/small.jpg`,
						mediumImageUrl: `https://img.spotify.com/${id}/medium.jpg`,
						largeImageUrl: `https://img.spotify.com/${id}/large.jpg`,
					})),
				});
			}),
		);

		await runtime.runPromise(program);

		const result = await runtime.runPromise(
			Effect.gen(function* () {
				const db = yield* Database;
				return yield* db.getSuggestionsByWeekId(currentSuggestionWeekId());
			}),
		);

		expect(Option.isSome(result)).toBe(true);
		if (Option.isSome(result)) {
			const ids = result.value.albums.map((a) => a.id);
			expect(ids).not.toContain("existing1");
			expect(ids).not.toContain("existing2");
			expect(ids.sort()).toEqual(
				["new1", "new2", "new3", "new4", "new5"].sort(),
			);
		}
	});

	test("stops after max attempts and proceeds with partial results", async () => {
		let attemptCount = 0;

		const TestAiService = Layer.effect(
			AiService,
			Effect.gen(function* () {
				const db = yield* Database;
				return {
					askForAlbums: () =>
						Effect.gen(function* () {
							attemptCount++;
							// Each attempt returns only 1 unique album
							const albums = [makeAlbum(`a${attemptCount}`)];
							const aiResponseId = yield* db.insertAiResponse({
								prompt: "test prompt",
								outputSchema: "test schema",
								model: "test-model",
								output: JSON.stringify({ albums }),
							});
							return { aiResponseId, albums };
						}),
				};
			}),
		);

		const TestSpotifyService = Layer.succeed(SpotifyService, {
			searchForAlbums: (albums: readonly Album[]) =>
				Effect.succeed(
					Stream.fromIterable(
						albums.map((a) =>
							Option.some(makeSpotifyAlbum(a.title.split(" ")[1]!)),
						),
					),
				),
		});

		const TestSongLinkService = Layer.succeed(SongLinkService, {
			getLinks: (url: string) => {
				const id = url.split("/").pop()!;
				return Effect.succeed(makeSongLinks(id));
			},
		});

		const TestLayer = Layer.mergeAll(
			TestAiService.pipe(Layer.provide(DatabaseTestLive)),
			TestSpotifyService,
			TestSongLinkService,
			DatabaseTestLive,
		);

		await using runtime = makeDisposableRuntime(TestLayer);

		await runtime.runPromise(program);

		const result = await runtime.runPromise(
			Effect.gen(function* () {
				const db = yield* Database;
				return yield* db.getSuggestionsByWeekId(currentSuggestionWeekId());
			}),
		);

		expect(attemptCount).toBe(3); // MAX_AI_ATTEMPTS
		expect(Option.isSome(result)).toBe(true);
		if (Option.isSome(result)) {
			expect(result.value.albums).toHaveLength(3); // Less than MIN_NEW_ALBUMS but still saved
			expect(result.value.albums.map((a) => a.id).sort()).toEqual([
				"a1",
				"a2",
				"a3",
			]);
		}
	});

	test("fails when no new albums found after all attempts", async () => {
		const TestAiService = Layer.effect(
			AiService,
			Effect.gen(function* () {
				const db = yield* Database;
				return {
					askForAlbums: () =>
						Effect.gen(function* () {
							// Always return the same already-existing album
							const albums = [makeAlbum("existing")];
							const aiResponseId = yield* db.insertAiResponse({
								prompt: "test prompt",
								outputSchema: "test schema",
								model: "test-model",
								output: JSON.stringify({ albums }),
							});
							return { aiResponseId, albums };
						}),
				};
			}),
		);

		const TestSpotifyService = Layer.succeed(SpotifyService, {
			searchForAlbums: (albums: readonly Album[]) =>
				Effect.succeed(
					Stream.fromIterable(
						albums.map((a) =>
							Option.some(makeSpotifyAlbum(a.title.split(" ")[1]!)),
						),
					),
				),
		});

		const TestSongLinkService = Layer.succeed(SongLinkService, {
			getLinks: (url: string) => {
				const id = url.split("/").pop()!;
				return Effect.succeed(makeSongLinks(id));
			},
		});

		const TestLayer = Layer.mergeAll(
			TestAiService.pipe(Layer.provide(DatabaseTestLive)),
			TestSpotifyService,
			TestSongLinkService,
			DatabaseTestLive,
		);

		await using runtime = makeDisposableRuntime(TestLayer);

		// Pre-populate with the album that AI will always return
		await runtime.runPromise(
			Effect.gen(function* () {
				const db = yield* Database;
				const aiResponseId = yield* db.insertAiResponse({
					prompt: "old prompt",
					outputSchema: "old schema",
					model: "old-model",
					output: "{}",
				});
				yield* db.insertWeeklyBatch({
					weekId: "2024W01",
					aiResponseId,
					albums: [
						{
							id: "existing",
							name: "Album existing",
							releaseDate: "2024-01-01",
							releaseDatePrecision: "day" as const,
							spotifyUrl: "https://open.spotify.com/album/existing",
							blurb: "Old blurb",
							artists: [{ id: "artist-existing", name: "Artist existing" }],
							smallImageUrl: "https://img.spotify.com/existing/small.jpg",
							mediumImageUrl: "https://img.spotify.com/existing/medium.jpg",
							largeImageUrl: "https://img.spotify.com/existing/large.jpg",
						},
					],
				});
			}),
		);

		expect(runtime.runPromise(program)).rejects.toThrow(
			"No new albums found after all attempts",
		);
	});
});
