import { LanguageModel } from "@effect/ai";
import {
  OpenRouterClient,
  OpenRouterLanguageModel,
} from "@effect/ai-openrouter";
import { FetchHttpClient } from "@effect/platform";
import {
  Array,
  Config,
  ConfigProvider,
  Console,
  Effect,
  Layer,
  Schema,
  Stream,
  Option,
} from "effect";
import { askForAlbums, MOCK_ALBUMS } from "./askForAlbums";
import { searchForAlbums } from "./spotify";
import { getSongLinks } from "./songLink";
import { Database, DatabaseLive } from "shared";
import { HoneycombLayer } from "./otel";

const program = Effect.gen(function* () {
  const { aiResponseId, albums } = yield* askForAlbums();

  const foundAlbums = yield* searchForAlbums(albums);

  const albumsWithLinks = yield* Stream.filterMap(
    foundAlbums,
    (option) => option,
  ).pipe(
    Stream.mapEffect(
      (albumWithBlurb) =>
        Effect.gen(function* () {
          const songLinks = yield* getSongLinks(albumWithBlurb.spotifyUrl);
          return { ...albumWithBlurb, songLinks };
        }),
      { concurrency: 10 },
    ),
    Stream.runCollect,
  );

  const db = yield* Database;

  const albumsArray = Array.fromIterable(albumsWithLinks);

  yield* db.insertAlbumSuggestions({
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

const OpenRouter = OpenRouterClient.layerConfig({
  apiKey: Config.redacted("OPENROUTER_API_KEY"),
}).pipe(Layer.provide(FetchHttpClient.layer));

const MainLayer = Layer.mergeAll(
  OpenRouter,
  FetchHttpClient.layer,
  DatabaseLive,
  HoneycombLayer,
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
