import { LibsqlClient } from "@effect/sql-libsql";
import * as SqliteDrizzle from "@effect/sql-drizzle/Sqlite";
import { SqlClient } from "@effect/sql";
import { Effect, Layer } from "effect";
import {
	Database,
	makeDatabaseImpl,
	nanoid,
	schema,
	EmbeddingService,
} from "shared";
import { unlinkSync, readFileSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createClient } from "@libsql/client";

// Custom migration runner using libsql client instead of Drizzle's native migrate().
// Drizzle's migrate uses bun:sqlite which doesn't support libsql-specific features
// like F32_BLOB vector types and libsql_vector_idx indexes.
const runMigrations = (dbPath: string, migrationsFolder: string) => {
	const client = createClient({ url: `file:${dbPath}` });

	client.executeMultiple(`
		CREATE TABLE IF NOT EXISTS __drizzle_migrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			hash TEXT NOT NULL,
			created_at NUMERIC
		)
	`);

	const migrationFiles = readdirSync(migrationsFolder)
		.filter((f) => f.endsWith(".sql"))
		.sort();

	for (const file of migrationFiles) {
		const sql = readFileSync(join(migrationsFolder, file), "utf-8");
		const statements = sql
			.split("--> statement-breakpoint")
			.map((s) => s.trim())
			.filter(Boolean);

		for (const stmt of statements) {
			client.execute(stmt);
		}
	}

	client.close();
};

const createTestDbLayer = () => {
	const tempFile = join(tmpdir(), `test-${nanoid()}.db`);

	// Run migrations using libsql client (supports F32_BLOB, vector indexes, etc.)
	runMigrations(tempFile, import.meta.dir + "/../../shared/drizzle");

	const libsqlClientLayer = LibsqlClient.layer({ url: `file:${tempFile}` });

	const databaseLayer = Layer.scoped(
		Database,
		Effect.gen(function* () {
			yield* Effect.addFinalizer(() => Effect.sync(() => unlinkSync(tempFile)));
			const sql = yield* SqlClient.SqlClient;
			const db = yield* SqliteDrizzle.make({ schema });
			return makeDatabaseImpl(db, sql);
		}),
	).pipe(Layer.provide(libsqlClientLayer));

	return Layer.merge(databaseLayer, libsqlClientLayer);
};

export const DatabaseTestLive = () => createTestDbLayer();

export const EmbeddingServiceTestLive = Layer.succeed(EmbeddingService, {
	generateEmbedding: () => Effect.succeed(Array(1536).fill(0)),
	generateEmbeddings: (texts: string[]) =>
		Effect.succeed(texts.map(() => Array(1536).fill(0))),
});
