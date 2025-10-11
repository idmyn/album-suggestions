import { LanguageModel } from "@effect/ai";
import {
  OpenRouterClient,
  OpenRouterLanguageModel,
} from "@effect/ai-openrouter";
import { FetchHttpClient } from "@effect/platform";
import { Config, Console, Effect, Layer, Schema } from "effect";

const Sonar = OpenRouterLanguageModel.model("perplexity/sonar");

const program = Effect.gen(function* () {
  const albums = yield* askForAlbums();
  yield* Console.log(albums);
});

const askForAlbums = Effect.fn("askForAlbums")(function* () {
  const response = yield* LanguageModel.generateObject({
    prompt: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Can you recommend three albums that were released in the past couple of weeks?",
          },
        ],
      },
    ],
    schema: Schema.Struct({
      albums: Schema.Array(
        Schema.Struct({
          title: Schema.String,
          artist: Schema.String,
          releaseDate: Schema.String,
        }),
      ),
    }),
  }).pipe(Effect.provide(Sonar));

  return response.value.albums;
});

const OpenRouter = OpenRouterClient.layerConfig({
  apiKey: Config.redacted("OPENROUTER_API_KEY"),
}).pipe(Layer.provide(FetchHttpClient.layer));

program.pipe(Effect.provide(OpenRouter), Effect.runPromise);
