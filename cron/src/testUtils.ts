import { SqliteClient } from "@effect/sql-sqlite-bun";
import * as SqliteDrizzle from "@effect/sql-drizzle/Sqlite";
import { SqlClient } from "@effect/sql";
import { Effect, Layer } from "effect";
import { Database, makeDatabaseImpl, schema } from "shared";

const runMigrations = (sql: SqlClient.SqlClient) =>
	Effect.gen(function* () {
		yield* sql`CREATE TABLE IF NOT EXISTS ai_responses (
			id text PRIMARY KEY NOT NULL,
			prompt text NOT NULL,
			outputSchema text NOT NULL,
			model text NOT NULL,
			output text NOT NULL,
			createdAt integer NOT NULL
		)`;
		yield* sql`CREATE TABLE IF NOT EXISTS albums (
			spotifyId text PRIMARY KEY NOT NULL,
			name text NOT NULL,
			releaseDate text NOT NULL,
			releaseDatePrecision text NOT NULL,
			appleMusicUrl text,
			tidalUrl text,
			spotifyUrl text NOT NULL,
			smallImageUrl text NOT NULL,
			mediumImageUrl text NOT NULL,
			largeImageUrl text NOT NULL
		)`;
		yield* sql`CREATE TABLE IF NOT EXISTS artists (
			spotifyId text PRIMARY KEY NOT NULL,
			name text NOT NULL
		)`;
		yield* sql`CREATE TABLE IF NOT EXISTS album_artists (
			albumId text NOT NULL,
			artistId text NOT NULL,
			PRIMARY KEY(albumId, artistId),
			FOREIGN KEY (albumId) REFERENCES albums(spotifyId) ON DELETE cascade,
			FOREIGN KEY (artistId) REFERENCES artists(spotifyId) ON DELETE cascade
		)`;
		yield* sql`CREATE TABLE IF NOT EXISTS album_suggestions (
			id text PRIMARY KEY NOT NULL,
			aiResponseId text,
			albumId text NOT NULL,
			blurb text NOT NULL,
			createdAt integer NOT NULL,
			FOREIGN KEY (aiResponseId) REFERENCES ai_responses(id) ON DELETE set null,
			FOREIGN KEY (albumId) REFERENCES albums(spotifyId) ON DELETE no action
		)`;
		yield* sql`CREATE TABLE IF NOT EXISTS weekly_batches (
			weekId text PRIMARY KEY NOT NULL,
			aiResponseId text NOT NULL,
			createdAt integer NOT NULL,
			FOREIGN KEY (aiResponseId) REFERENCES ai_responses(id) ON DELETE cascade
		)`;
		yield* sql`CREATE UNIQUE INDEX IF NOT EXISTS weekly_batches_aiResponseId_unique ON weekly_batches (aiResponseId)`;
		yield* sql`CREATE UNIQUE INDEX IF NOT EXISTS album_suggestions_album_id_unique ON album_suggestions (albumId)`;
	});

const TestSqlLive = SqliteClient.layer({ filename: ":memory:" });

export const DatabaseTestLive = Layer.scoped(
	Database,
	Effect.gen(function* () {
		const sql = yield* SqlClient.SqlClient;
		yield* runMigrations(sql);
		const db = yield* SqliteDrizzle.make({ schema });
		return makeDatabaseImpl(db, sql);
	}),
).pipe(Layer.provide(TestSqlLive));
