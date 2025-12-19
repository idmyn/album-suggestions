import { Database as SQLiteDatabase } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { Layer } from "effect";
import { Database, makeDatabaseImpl, schema } from "shared";

export const DatabaseTestLive = Layer.sync(Database, () => {
	const sqlite = new SQLiteDatabase(":memory:");
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: import.meta.dir + "/../../shared/drizzle" });
	return makeDatabaseImpl(
		db as unknown as BaseSQLiteDatabase<"async", unknown, typeof schema>,
	);
});
