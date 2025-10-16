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
      insertAiResponse: (data) =>
        Effect.gen(function* () {
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
    };
  }),
);
