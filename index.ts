import { LanguageModel } from "@effect/ai";
import {
  OpenRouterClient,
  OpenRouterLanguageModel,
} from "@effect/ai-openrouter";
import { FetchHttpClient } from "@effect/platform";
import { Config, Effect, Layer, Stream } from "effect";

const Gpt4o = OpenRouterLanguageModel.model("openai/gpt-4o");

const program = LanguageModel.streamText({
  prompt: [
    {
      role: "system",
      content: "You are a comedian with a penchant for groan-inducing puns",
    },
    { role: "user", content: [{ type: "text", text: "Tell me a dad joke" }] },
  ],
}).pipe(
  Stream.filter((part) => part.type === "text-delta"),
  Stream.runForEach((part) =>
    Effect.sync(() => process.stdout.write(part.delta)),
  ),
  Effect.provide(Gpt4o),
);

const OpenRouter = OpenRouterClient.layerConfig({
  apiKey: Config.redacted("OPENROUTER_API_KEY"),
}).pipe(Layer.provide(FetchHttpClient.layer));

program.pipe(Effect.provide(OpenRouter), Effect.runPromise);
