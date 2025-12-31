import { Database as SQLiteDatabase } from "bun:sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import * as SqliteDrizzle from "@effect/sql-drizzle/Sqlite";
import { SqlClient } from "@effect/sql";
import { Effect, Layer } from "effect";
import { Database, makeDatabaseImpl, nanoid, schema } from "shared";
import { unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const createTestDbLayer = () => {
	const tempFile = join(tmpdir(), `test-${nanoid()}.db`);

	// Run migrations with drizzle-orm directly
	const sqlite = new SQLiteDatabase(tempFile);
	const tempDrizzle = drizzle(sqlite, { schema });
	migrate(tempDrizzle, {
		migrationsFolder: import.meta.dir + "/../../shared/drizzle",
	});
	sqlite.close();

	return Layer.scoped(
		Database,
		Effect.gen(function* () {
			yield* Effect.addFinalizer(() => Effect.sync(() => unlinkSync(tempFile)));
			const sql = yield* SqlClient.SqlClient;
			const db = yield* SqliteDrizzle.make({ schema });
			return makeDatabaseImpl(db, sql);
		}),
	).pipe(Layer.provide(SqliteClient.layer({ filename: tempFile })));
};

export const DatabaseTestLive = () => createTestDbLayer();
