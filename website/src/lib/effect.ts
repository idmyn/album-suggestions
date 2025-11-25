import { Database, DatabaseLive } from "shared";
import { query } from "$app/server";
import { Effect } from "effect";

export const effectQuery = <A>(mk: () => Effect.Effect<A, unknown, Database>) =>
	query(async () => mk().pipe(Effect.provide(DatabaseLive), Effect.runPromise));
