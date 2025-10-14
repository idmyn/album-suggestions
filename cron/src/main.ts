import { LanguageModel } from "@effect/ai";
import {
  OpenRouterClient,
  OpenRouterLanguageModel,
} from "@effect/ai-openrouter";
import { FetchHttpClient } from "@effect/platform";
import {
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

const program = Effect.gen(function* () {
  const albums = yield* askForAlbums();
  yield* Console.log(JSON.stringify(albums, null, 2));

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

  yield* Console.log(JSON.stringify(albumsWithLinks, null, 2));

  yield* Console.log(
    `\nProcessed ${albumsWithLinks.length} albums successfully (${albums.length - albumsWithLinks.length} albums skipped due to no Spotify results)`,
  );
});

const OpenRouter = OpenRouterClient.layerConfig({
  apiKey: Config.redacted("OPENROUTER_API_KEY"),
}).pipe(Layer.provide(FetchHttpClient.layer));

const MainLayer = Layer.mergeAll(OpenRouter, FetchHttpClient.layer);

const programWithLayer = Effect.provide(program, MainLayer);

export const run = async (env?: Env): Promise<void> => {
  const programToRun = env
    ? programWithLayer.pipe(
        Effect.withConfigProvider(ConfigProvider.fromJson(env)),
      )
    : programWithLayer;
  await Effect.runPromise(programToRun);
};
