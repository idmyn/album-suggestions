import { LanguageModel } from "@effect/ai";
import { OpenRouterLanguageModel } from "@effect/ai-openrouter";
import { Effect, Schema } from "effect";

const Sonar = OpenRouterLanguageModel.model("perplexity/sonar");

const Album = Schema.Struct({
  title: Schema.String,
  artist: Schema.String,
  releaseDate: Schema.String,
});
export type Album = Schema.Schema.Type<typeof Album>;

export const askForAlbums = Effect.fn("askForAlbums")(function* () {
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
      albums: Schema.Array(Album),
    }),
  }).pipe(Effect.provide(Sonar));

  return response.value.albums;
});

export const MOCK_ALBUMS = [
  {
    title: "Don't Trust Mirrors",
    artist: "Kelly Moran",
    releaseDate: "October 1, 2025",
    spotifyUrl: "https://open.spotify.com/album/placeholder-donttrustmirrors",
  },
  {
    title: "Unplugged (20th Anniversary)",
    artist: "Alicia Keys",
    releaseDate: "October 3, 2025",
    spotifyUrl: "https://open.spotify.com/album/placeholder-alicia-unplugged",
  },
  {
    title: "Blasting Off",
    artist: "Buscrates",
    releaseDate: "October 10, 2025",
    spotifyUrl:
      "https://open.spotify.com/album/placeholder-buscrates-blastingoff",
  },
];
