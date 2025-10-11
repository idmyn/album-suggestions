import { LanguageModel } from "@effect/ai";
import {
  OpenRouterClient,
  OpenRouterLanguageModel,
} from "@effect/ai-openrouter";
import { FetchHttpClient } from "@effect/platform";
import { Config, Effect, Layer } from "effect";

const Sonar = OpenRouterLanguageModel.model("perplexity/sonar");

const program = Effect.gen(function* () {
  const response = yield* LanguageModel.generateText({
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
  });

  yield* Effect.sync(() => process.stdout.write(response.text));
}).pipe(Effect.provide(Sonar));

const OpenRouter = OpenRouterClient.layerConfig({
  apiKey: Config.redacted("OPENROUTER_API_KEY"),
}).pipe(Layer.provide(FetchHttpClient.layer));

program.pipe(Effect.provide(OpenRouter), Effect.runPromise);
