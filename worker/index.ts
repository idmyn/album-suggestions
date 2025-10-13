import { LanguageModel } from "@effect/ai";
import {
  OpenRouterClient,
  OpenRouterLanguageModel,
} from "@effect/ai-openrouter";
import { FetchHttpClient } from "@effect/platform";
import { Config, Console, Effect, Layer, Schema, Stream } from "effect";
import { askForAlbums, MOCK_ALBUMS } from "./src/askForAlbums";
import { fetchAccessToken, getSpotifyAlbum } from "./src/spotify";
import { getSongLinks } from "./src/songLink";

const program = Effect.gen(function* () {
  const albums = yield* askForAlbums();

  const accessToken = yield* fetchAccessToken();

  const albumsWithLinks = yield* Stream.fromIterable(albums).pipe(
    Stream.mapEffect((album) =>
      Effect.gen(function* () {
        const spotifyAlbum = yield* getSpotifyAlbum(accessToken, album);
        return spotifyAlbum;
      }),
    ),
    Stream.mapEffect((spotifyAlbum) =>
      Effect.gen(function* () {
        const songLinks = yield* getSongLinks(spotifyAlbum.spotifyUrl);
        return { ...spotifyAlbum, songLinks };
      }),
    ),
    Stream.runCollect,
  );

  yield* Console.log(JSON.stringify(albumsWithLinks, null, 2));

  yield* Console.log(
    `\nProcessed ${albumsWithLinks.length} albums successfully`,
  );
});

const OpenRouter = OpenRouterClient.layerConfig({
  apiKey: Config.redacted("OPENROUTER_API_KEY"),
}).pipe(Layer.provide(FetchHttpClient.layer));

const MainLayer = Layer.mergeAll(OpenRouter, FetchHttpClient.layer);

program.pipe(Effect.provide(MainLayer), Effect.runPromise);
