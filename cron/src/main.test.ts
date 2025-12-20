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
import { Database } from "shared";
import { DatabaseTestLive } from "./testUtils";

const mockAlbum: Album = {
	title: "Test Album",
	artist: "Test Artist",
	blurb: "A great album",
	genres: ["pop"],
};

const mockSpotifyAlbum: SpotifyAlbumWithBlurb = {
	id: "spotify-123",
	name: "Test Album",
	spotifyUrl: "https://open.spotify.com/album/123",
	releaseDate: "2025-01-01",
	releaseDatePrecision: "day",
	images: {
		smallImageUrl: "https://img.spotify.com/small.jpg",
		mediumImageUrl: "https://img.spotify.com/medium.jpg",
		largeImageUrl: "https://img.spotify.com/large.jpg",
	},
	artists: [{ id: "artist-1", name: "Test Artist" }],
	blurb: "A great album",
};

const mockSongLinks: SongLinks = {
	entityUniqueId: "SPOTIFY_ALBUM::123",
	userCountry: "US",
	pageUrl: "https://song.link/123",
	linksByPlatform: {
		spotify: {
			country: "US",
			url: "https://open.spotify.com/album/123",
			entityUniqueId: "SPOTIFY_ALBUM::123",
		},
		appleMusic: {
			country: "US",
			url: "https://music.apple.com/album/123",
			entityUniqueId: "APPLE_MUSIC::123",
		},
		tidal: {
			country: "US",
			url: "https://tidal.com/album/123",
			entityUniqueId: "TIDAL::123",
		},
	},
};

describe("cron program", () => {
	test("happy path: fetches albums, enriches with links, inserts to db", async () => {
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
								output: JSON.stringify({ albums: [mockAlbum] }),
							});
							return {
								aiResponseId,
								albums: [mockAlbum],
							};
						}),
				};
			}),
		);

		const TestSpotifyService = Layer.succeed(SpotifyService, {
			searchForAlbums: () =>
				Effect.succeed(Stream.fromIterable([Option.some(mockSpotifyAlbum)])),
		});

		const TestSongLinkService = Layer.succeed(SongLinkService, {
			getLinks: () => Effect.succeed(mockSongLinks),
		});

		const TestAiServiceWithDb = TestAiService.pipe(
			Layer.provide(DatabaseTestLive),
		);

		const TestLayer = Layer.mergeAll(
			TestAiServiceWithDb,
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
			const { albums } = result.value;
			expect(albums).toHaveLength(1);
			expect(albums[0]).toEqual(
				expect.objectContaining({
					id: "spotify-123",
					name: "Test Album",
					blurb: "A great album",
					spotifyUrl: "https://open.spotify.com/album/123",
					appleMusicUrl: "https://music.apple.com/album/123",
					tidalUrl: "https://tidal.com/album/123",
					artists: [{ id: "artist-1", name: "Test Artist" }],
					images: expect.objectContaining({
						small: "https://img.spotify.com/small.jpg",
					}),
				}),
			);
		}
	});
});
