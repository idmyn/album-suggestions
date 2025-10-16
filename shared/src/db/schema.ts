import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  unique,
} from "drizzle-orm/sqlite-core";

export const aiResponses = sqliteTable("ai_responses", {
  id: text().primaryKey(),
  prompt: text().notNull(),
  outputSchema: text(),
  model: text().notNull(),
  output: text().notNull(),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const albums = sqliteTable(
  "albums",
  {
    id: text().primaryKey(),
    platform: text().notNull().default("spotify"),
    externalId: text().notNull(),
    name: text().notNull(),
  },
  (table) => [unique().on(table.platform, table.externalId)],
);

export const artists = sqliteTable(
  "artists",
  {
    id: text().primaryKey(),
    platform: text().notNull().default("spotify"),
    externalId: text().notNull(),
    name: text().notNull(),
  },
  (table) => [unique().on(table.platform, table.externalId)],
);

export const albumArtists = sqliteTable(
  "album_artists",
  {
    albumId: text()
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    artistId: text()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.albumId, table.artistId] })],
);

export const albumSuggestions = sqliteTable("album_suggestions", {
  id: text().primaryKey(),
  aiResponseId: text().references(() => aiResponses.id, {
    onDelete: "set null",
  }),
  albumId: text()
    .notNull()
    .references(() => albums.id),
  blurb: text(),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
});
