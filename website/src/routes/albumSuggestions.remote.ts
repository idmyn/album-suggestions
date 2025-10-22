import { Database, DatabaseLive } from "shared";
import { query } from "$app/server";
import { Effect, Option } from "effect";
import type { AlbumSuggestions } from "shared/src/db/service";

export const getLatestAlbumSuggestions = query(
  async (): Promise<AlbumSuggestions | null> => {
    return await Effect.runPromise(
      Database.pipe(
        Effect.flatMap((db) => db.getLatestAlbumSuggestions()),
        Effect.map(Option.getOrNull),
        Effect.provide(DatabaseLive),
      ),
    );
  },
);
