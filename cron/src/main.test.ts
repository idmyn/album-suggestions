import { describe, test, expect, mock } from "bun:test";
import { Effect, Layer, Option, Stream } from "effect";
import { program } from "./main";
import { AiService, type Album } from "./askForAlbums";
import { SpotifyService, type SpotifyAlbumWithBlurb } from "./spotify";
import { SongLinkService, type SongLinks } from "./songLink";
import { Database } from "shared";

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
		const insertWeeklyBatchMock = mock((_batch) => Effect.void);

		const TestAiService = Layer.succeed(AiService, {
			askForAlbums: () =>
				Effect.succeed({
					aiResponseId: "ai-response-123",
					albums: [mockAlbum],
				}),
		});

		const TestSpotifyService = Layer.succeed(SpotifyService, {
			searchForAlbums: () =>
				Effect.succeed(Stream.fromIterable([Option.some(mockSpotifyAlbum)])),
		});

		const TestSongLinkService = Layer.succeed(SongLinkService, {
			getLinks: () => Effect.succeed(mockSongLinks),
		});

		const TestDatabase = Layer.succeed(Database, {
			insertAiResponse: () => Effect.succeed("unused"),
			insertWeeklyBatch: (data) => insertWeeklyBatchMock(data),
			getLatestAlbumSuggestions: () => Effect.succeed(Option.none()),
			getSuggestionsByWeekId: () => Effect.succeed(Option.none()),
			getAllWeekIds: () => Effect.succeed([]),
			getRecentWeekIds: () => Effect.succeed([]),
		});

		const TestLayer = Layer.mergeAll(
			TestAiService,
			TestSpotifyService,
			TestSongLinkService,
			TestDatabase,
		);

		await Effect.runPromise(Effect.provide(program, TestLayer));

		expect(insertWeeklyBatchMock).toHaveBeenCalledWith(
			expect.objectContaining({
				aiResponseId: "ai-response-123",
				albums: [
					expect.objectContaining({
						id: "spotify-123",
						name: "Test Album",
						blurb: "A great album",
						spotifyUrl: "https://open.spotify.com/album/123",
						appleMusicUrl: "https://music.apple.com/album/123",
						tidalUrl: "https://tidal.com/album/123",
						artists: [{ id: "artist-1", name: "Test Artist" }],
						smallImageUrl: "https://img.spotify.com/small.jpg",
					}),
				],
			}),
		);
	});
});
