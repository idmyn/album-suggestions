import { OpenRouterClient } from "@effect/ai-openrouter";
import { FetchHttpClient, HttpClient } from "@effect/platform";
import {
	Array,
	Config,
	ConfigProvider,
	Console,
	Effect,
	Layer,
	Stream,
} from "effect";
import { AiService, AiServiceLive } from "./askForAlbums";
import { SpotifyService, SpotifyServiceLive } from "./spotify";
import { SongLinkService, SongLinkServiceLive } from "./songLink";
import { Database, DatabaseLive, currentSuggestionWeekId } from "shared";
import { HoneycombLayer } from "./otel";

const program = Effect.gen(function* () {
	const ai = yield* AiService;
	const spotify = yield* SpotifyService;
	const songLink = yield* SongLinkService;
	const db = yield* Database;

	const { aiResponseId, albums } = yield* ai.askForAlbums();

	const foundAlbums = yield* spotify.searchForAlbums(albums);

	const albumsWithLinks = yield* Stream.filterMap(
		foundAlbums,
		(option) => option,
	).pipe(
		Stream.mapEffect(
			(albumWithBlurb) =>
				Effect.gen(function* () {
					const songLinks = yield* songLink.getLinks(albumWithBlurb.spotifyUrl);
					return { ...albumWithBlurb, songLinks };
				}),
			{ concurrency: 10 },
		),
		Stream.runCollect,
	);

	const albumsArray = Array.fromIterable(albumsWithLinks);

	yield* db.insertWeeklyBatch({
		weekId: currentSuggestionWeekId(),
		aiResponseId,
		albums: albumsArray.map((album) => ({
			id: album.id,
			name: album.name,
			releaseDate: album.releaseDate,
			releaseDatePrecision: album.releaseDatePrecision,
			appleMusicUrl: album.songLinks.linksByPlatform.appleMusic?.url,
			tidalUrl: album.songLinks.linksByPlatform.tidal?.url,
			spotifyUrl: album.spotifyUrl,
			blurb: album.blurb,
			artists: Array.fromIterable(album.artists),
			smallImageUrl: album.images.smallImageUrl,
			mediumImageUrl: album.images.mediumImageUrl,
			largeImageUrl: album.images.largeImageUrl,
		})),
	});

	yield* Console.log(
		`\nProcessed ${albumsWithLinks.length} albums successfully (${albums.length - albumsWithLinks.length} albums skipped due to no Spotify results)`,
	);
}).pipe(Effect.withSpan("cron.run"));

const OpenRouterLive = OpenRouterClient.layerConfig({
	apiKey: Config.redacted("OPENROUTER_API_KEY"),
}).pipe(Layer.provide(FetchHttpClient.layer));

const AiServiceWithDeps = AiServiceLive.pipe(
	Layer.provide(DatabaseLive),
	Layer.provide(OpenRouterLive),
);

const SpotifyServiceWithDeps = SpotifyServiceLive.pipe(
	Layer.provide(FetchHttpClient.layer),
);

const SongLinkServiceWithDeps = SongLinkServiceLive.pipe(
	Layer.provide(FetchHttpClient.layer),
);

const MainLayer = Layer.mergeAll(
	DatabaseLive,
	HoneycombLayer,
	AiServiceWithDeps,
	SpotifyServiceWithDeps,
	SongLinkServiceWithDeps,
);

const programWithLayer = Effect.provide(program, MainLayer);

export const run = async (env?: Env): Promise<void> => {
	const programToRun = env
		? programWithLayer.pipe(
				Effect.withConfigProvider(ConfigProvider.fromJson(env)),
			)
		: programWithLayer;
	await Effect.runPromise(programToRun);
};
