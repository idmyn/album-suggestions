import { createClient } from "@libsql/client";
import { Config, Context, Data, Effect, Layer } from "effect";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { nanoid } from "./utils";

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  cause: unknown;
}> {}

export class Database extends Context.Tag("Database")<
  Database,
  {
    insertAiResponse: (data: {
      prompt: string;
      outputSchema: string;
      model: string;
      output: string;
    }) => Effect.Effect<string, DatabaseError>;
    insertArtists: (
      artists: Array<{ id: string; name: string }>,
    ) => Effect.Effect<void, DatabaseError>;
    insertAlbums: (
      albums: Array<{
        id: string;
        name: string;
        appleMusicUrl?: string;
        tidalUrl?: string;
        spotifyUrl: string;
        artistIds: string[];
      }>,
    ) => Effect.Effect<void, DatabaseError>;
    insertAlbumSuggestions: (
      suggestions: Array<{
        aiResponseId?: string;
        albumId: string;
        blurb?: string;
      }>,
    ) => Effect.Effect<void, DatabaseError>;
  }
>() {}

export const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const url = yield* Config.string("TURSO_DATABASE_URL");
    const authToken = yield* Config.string("TURSO_AUTH_TOKEN");

    const client = createClient({ url, authToken });
    const db = drizzle(client, { schema });

    return {
      insertAiResponse: Effect.fn("db.insertAiResponse")(function* (data) {
        const id = nanoid();
        yield* Effect.tryPromise({
          try: () =>
            db.insert(schema.aiResponses).values({
              id,
              prompt: data.prompt,
              outputSchema: data.outputSchema,
              model: data.model,
              output: data.output,
              createdAt: new Date(),
            }),
          catch: (cause) => new DatabaseError({ cause }),
        });
        return id;
      }),

      insertArtists: Effect.fn("db.insertArtists")(function* (artists) {
        yield* Effect.tryPromise({
          try: () =>
            db
              .insert(schema.artists)
              .values(
                artists.map((artist) => ({
                  id: nanoid(),
                  spotifyId: artist.id,
                  name: artist.name,
                })),
              )
              .onConflictDoNothing(),
          catch: (cause) => new DatabaseError({ cause }),
        });
      }),

      insertAlbums: Effect.fn("db.insertAlbums")(function* (albums) {
        // TODO use transaction
        yield* Effect.tryPromise({
          try: () =>
            db
              .insert(schema.albums)
              .values(
                albums.map((album) => ({
                  spotifyId: album.id,
                  name: album.name,
                  appleMusicUrl: album.appleMusicUrl ?? null,
                  tidalUrl: album.tidalUrl ?? null,
                  spotifyUrl: album.spotifyUrl,
                })),
              )
              .onConflictDoNothing(),
          catch: (cause) => new DatabaseError({ cause }),
        });

        const albumArtistPairs = albums.flatMap((album) =>
          album.artistIds.map((artistId) => ({
            albumId: album.id,
            artistId,
          })),
        );

        yield* Effect.tryPromise({
          try: () =>
            db
              .insert(schema.albumArtists)
              .values(albumArtistPairs)
              .onConflictDoNothing(),
          catch: (cause) => new DatabaseError({ cause }),
        });
      }),

      insertAlbumSuggestions: Effect.fn("db.insertAlbumSuggestions")(
        function* (suggestions) {
          yield* Effect.tryPromise({
            try: () =>
              db
                .insert(schema.albumSuggestions)
                .values(
                  suggestions.map((suggestion) => ({
                    id: nanoid(),
                    aiResponseId: suggestion.aiResponseId ?? null,
                    albumId: suggestion.albumId,
                    blurb: suggestion.blurb ?? null,
                    createdAt: new Date(),
                  })),
                )
                .onConflictDoNothing(),
            catch: (cause) => new DatabaseError({ cause }),
          });
        },
      ),
    };
  }),
);
