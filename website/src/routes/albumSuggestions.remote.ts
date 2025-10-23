import { Database, DatabaseLive } from "shared";
import { query } from "$app/server";
import { Effect, Option, pipe } from "effect";
import type { AlbumSuggestions } from "shared/src/db/service";

function effectQuery<A>(mk: () => Effect.Effect<A, unknown, never>) {
  return query(async () => Effect.runPromise(mk()));
}

export const getLatestAlbumSuggestions = effectQuery(() =>
  Effect.gen(function* () {
    return yield* Database.pipe(
      Effect.flatMap((db) => db.getLatestAlbumSuggestions()),
      Effect.map(Option.getOrNull),
      Effect.provide(DatabaseLive),
    );
  }),
);
