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
import { fetchAccessToken, getSpotifyAlbum } from "./spotify";
import { getSongLinks } from "./songLink";
import { Database, DatabaseLive } from "shared";
import { HoneycombLayer } from "./otel";

const program = Effect.gen(function* () {
  const albums = yield* askForAlbums();

  const accessToken = yield* fetchAccessToken();

  const albumsWithLinks = yield* Stream.fromIterable(albums).pipe(
    Stream.mapEffect((album) =>
      Effect.gen(function* () {
        const spotifyAlbumOption = yield* getSpotifyAlbum(accessToken, album);

        if (Option.isNone(spotifyAlbumOption)) {
          yield* Console.error(
            `⚠️  No Spotify results found for "${album.title}" by ${album.artist}`,
          );
        }

        return Option.map(spotifyAlbumOption, (spotifyAlbum) => ({
          ...spotifyAlbum,
          originalAlbum: album,
        }));
      }),
    ),
    Stream.filterMap((option) => option),
    Stream.mapEffect((albumWithOriginal) =>
      Effect.gen(function* () {
        const songLinks = yield* getSongLinks(albumWithOriginal.spotifyUrl);
        return { ...albumWithOriginal, songLinks };
      }),
    ),
    Stream.runCollect,
  );

  const db = yield* Database;

  const albumsArray = Array.fromIterable(albumsWithLinks);
  const allArtists = albumsArray.flatMap((album) => album.artists);
  const uniqueArtists = Array.dedupeWith(allArtists, (a, b) => a.id === b.id);

  yield* db.insertArtists(uniqueArtists);
  yield* db.insertAlbums(
    albumsArray.map((album) => ({
      id: album.id,
      name: album.name,
      appleMusicUrl: album.songLinks.linksByPlatform.appleMusic?.url,
      tidalUrl: album.songLinks.linksByPlatform.tidal?.url,
      spotifyUrl: album.spotifyUrl,
      artistIds: album.artists.map((a) => a.id),
    })),
  );
  yield* db.insertAlbumSuggestions(
    albumsArray.map((album) => ({
      albumId: album.id,
      blurb: album.originalAlbum.blurb,
    })),
  );

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
