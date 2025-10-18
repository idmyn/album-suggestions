import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const aiResponses = sqliteTable("ai_responses", {
  id: text().primaryKey(),
  prompt: text().notNull(),
  outputSchema: text(),
  model: text().notNull(),
  output: text().notNull(),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const albums = sqliteTable("albums", {
  spotifyId: text().primaryKey(),
  name: text().notNull(),
  appleMusicUrl: text(),
  tidalUrl: text(),
  spotifyUrl: text().notNull(),
});

export const artists = sqliteTable("artists", {
  spotifyId: text().primaryKey(),
  name: text().notNull(),
});

export const albumArtists = sqliteTable(
  "album_artists",
  {
    albumId: text()
      .notNull()
      .references(() => albums.spotifyId, { onDelete: "cascade" }),
    artistId: text()
      .notNull()
      .references(() => artists.spotifyId, { onDelete: "cascade" }),
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
    .references(() => albums.spotifyId),
  blurb: text(),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
});
