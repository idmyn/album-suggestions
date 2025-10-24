import { Database } from "shared";
import { Effect, Option } from "effect";
import { effectQuery } from "$lib/effect";

export const getLatestAlbumSuggestions = effectQuery(() =>
  Effect.gen(function* () {
    const db = yield* Database;
    const suggestions = yield* db.getLatestAlbumSuggestions();
    return Option.getOrNull(suggestions);
  }),
);
