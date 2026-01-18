import { OpenRouterClient } from "@effect/ai-openrouter";
import { FetchHttpClient } from "@effect/platform";
import {
	Array,
	Config,
	ConfigProvider,
	Console,
	Effect,
	Layer,
	ManagedRuntime,
	Stream,
} from "effect";
import { AiService, AiServiceLive } from "./askForAlbums";
import {
	SpotifyService,
	SpotifyServiceLive,
	type SpotifyAlbumWithBlurb,
} from "./spotify";
import {
	SongLinkService,
	SongLinkServiceLive,
	type SongLinks,
} from "./songLink";
import {
	Database,
	DatabaseLive,
	currentSuggestionWeekId,
	EmbeddingService,
	EmbeddingServiceLive,
	LibsqlLive,
} from "shared";
import { HoneycombLayer } from "./otel";

const MIN_NEW_ALBUMS = 5;
const MAX_AI_ATTEMPTS = 3;

type AlbumWithLinks = SpotifyAlbumWithBlurb & { songLinks: SongLinks };

type AttemptState = {
	attempt: number;
	aiResponseId: string | null;
	accumulatedAlbums: AlbumWithLinks[];
	seenIds: Set<string>;
	lastAttemptFound: number;
};

const runSingleAttempt = (alreadySuggestedIds: Set<string>) =>
	Effect.gen(function* () {
		const ai = yield* AiService;
		const spotify = yield* SpotifyService;
		const songLink = yield* SongLinkService;

		const { aiResponseId, albums } = yield* ai.askForAlbums();

		const foundAlbums = yield* spotify.searchForAlbums(albums);

		const albumsWithLinks = yield* Stream.filterMap(
			foundAlbums,
			(option) => option,
		).pipe(
			Stream.mapEffect(
				(albumWithBlurb) =>
					Effect.gen(function* () {
						const songLinks = yield* songLink.getLinks(
							albumWithBlurb.spotifyUrl,
						);
						return { ...albumWithBlurb, songLinks };
					}),
				{ concurrency: 10 },
			),
			Stream.runCollect,
		);

		const albumsArray = Array.fromIterable(albumsWithLinks) as AlbumWithLinks[];
		const newAlbums = albumsArray.filter(
			(album) => !alreadySuggestedIds.has(album.id),
		);

		return {
			aiResponseId,
			totalFound: albumsArray.length,
			newAlbums,
		};
	});

export const program = Effect.gen(function* () {
	const db = yield* Database;

	const existingAlbumIdsArray = yield* db.getAllSuggestedAlbumIds();
	const existingAlbumIds = new Set(existingAlbumIdsArray);

	const initialState: AttemptState = {
		attempt: 0,
		aiResponseId: null,
		accumulatedAlbums: [],
		seenIds: new Set(existingAlbumIds),
		lastAttemptFound: 0,
	};

	const finalState = yield* Effect.iterate(initialState, {
		while: (state) =>
			state.accumulatedAlbums.length < MIN_NEW_ALBUMS &&
			state.attempt < MAX_AI_ATTEMPTS,
		body: (state) =>
			Effect.gen(function* () {
				const nextAttempt = state.attempt + 1;
				yield* Console.log(
					`\nAttempt ${nextAttempt}/${MAX_AI_ATTEMPTS}: Fetching album suggestions...`,
				);

				const { aiResponseId, totalFound, newAlbums } = yield* runSingleAttempt(
					state.seenIds,
				);

				const uniqueNewAlbums: AlbumWithLinks[] = [];
				const updatedSeenIds = new Set(state.seenIds);
				for (const album of newAlbums) {
					if (!updatedSeenIds.has(album.id)) {
						updatedSeenIds.add(album.id);
						uniqueNewAlbums.push(album);
					}
				}

				const updatedAccumulated = [
					...state.accumulatedAlbums,
					...uniqueNewAlbums,
				];

				yield* Console.log(
					`Found ${uniqueNewAlbums.length} NEW albums (${totalFound - uniqueNewAlbums.length} duplicates filtered), total: ${updatedAccumulated.length}`,
				);

				if (
					updatedAccumulated.length < MIN_NEW_ALBUMS &&
					nextAttempt < MAX_AI_ATTEMPTS
				) {
					yield* Console.log(
						`Only ${updatedAccumulated.length} new albums (need ${MIN_NEW_ALBUMS}), retrying...`,
					);
				}

				return {
					attempt: nextAttempt,
					aiResponseId,
					accumulatedAlbums: updatedAccumulated,
					seenIds: updatedSeenIds,
					lastAttemptFound: totalFound,
				};
			}),
	});

	if (!finalState.aiResponseId || finalState.accumulatedAlbums.length === 0) {
		return yield* Effect.fail(
			new Error("No new albums found after all attempts"),
		);
	}

	if (finalState.accumulatedAlbums.length < MIN_NEW_ALBUMS) {
		yield* Console.log(
			`Max attempts reached. Proceeding with ${finalState.accumulatedAlbums.length} new albums.`,
		);
	}

	const weekId = currentSuggestionWeekId();
	const albumData = finalState.accumulatedAlbums.map((album) => ({
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
	}));

	yield* db.insertWeeklyBatch({
		weekId,
		aiResponseId: finalState.aiResponseId,
		albums: albumData,
	});

	yield* Console.log(
		`\nProcessed ${finalState.accumulatedAlbums.length} NEW albums successfully across ${finalState.attempt} attempt(s)`,
	);

	const embeddingService = yield* EmbeddingService;
	const blurbs = albumData.map((a) => a.blurb);
	const embeddings = yield* embeddingService.generateEmbeddings(blurbs);
	const embeddingsWithIds = Array.zip(albumData, embeddings).map(
		([a, embedding]) => ({
			albumId: a.id,
			embedding,
		}),
	);
	yield* db.storeEmbeddingsForWeek(weekId, embeddingsWithIds);
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
	LibsqlLive,
	HoneycombLayer,
	AiServiceWithDeps,
	SpotifyServiceWithDeps,
	SongLinkServiceWithDeps,
	EmbeddingServiceLive,
);

const disposableRuntime = (env?: Env) => {
	const configLayer = env
		? Layer.setConfigProvider(ConfigProvider.fromJson(env))
		: Layer.empty;

	const MainLayerWithConfig = MainLayer.pipe(Layer.provide(configLayer));

	const runtime = ManagedRuntime.make(MainLayerWithConfig);
	return Object.assign(runtime, {
		[Symbol.asyncDispose]: () => runtime.dispose(),
	});
};

export const run = async (env?: Env): Promise<void> => {
	await using runtime = disposableRuntime(env);
	await runtime.runPromise(program);
};
