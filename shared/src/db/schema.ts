import {
	sqliteTable,
	text,
	integer,
	primaryKey,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const aiResponses = sqliteTable("ai_responses", {
	id: text().primaryKey(),
	prompt: text().notNull(),
	outputSchema: text().notNull(),
	model: text().notNull(),
	output: text().notNull(),
	createdAt: integer({ mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export const albums = sqliteTable("albums", {
	spotifyId: text().primaryKey(),
	name: text().notNull(),
	releaseDate: text().notNull(),
	releaseDatePrecision: text({ enum: ["year", "month", "day"] }).notNull(),
	appleMusicUrl: text(),
	tidalUrl: text(),
	spotifyUrl: text().notNull(),
	smallImageUrl: text().notNull(),
	mediumImageUrl: text().notNull(),
	largeImageUrl: text().notNull(),
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
	blurb: text().notNull(),
	createdAt: integer({ mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export const weeklyBatches = sqliteTable("weekly_batches", {
	weekId: text().primaryKey(),
	aiResponseId: text()
		.notNull()
		.unique()
		.references(() => aiResponses.id, { onDelete: "cascade" }),
	createdAt: integer({ mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export const aiResponsesRelations = relations(aiResponses, ({ many, one }) => ({
	albumSuggestions: many(albumSuggestions),
	weeklyBatch: one(weeklyBatches, {
		fields: [aiResponses.id],
		references: [weeklyBatches.aiResponseId],
	}),
}));

export const albumSuggestionsRelations = relations(
	albumSuggestions,
	({ one }) => ({
		aiResponse: one(aiResponses, {
			fields: [albumSuggestions.aiResponseId],
			references: [aiResponses.id],
		}),
		albums: one(albums, {
			fields: [albumSuggestions.albumId],
			references: [albums.spotifyId],
		}),
	}),
);

export const albumsRelations = relations(albums, ({ many }) => ({
	albumArtists: many(albumArtists),
}));

export const albumArtistsRelations = relations(albumArtists, ({ one }) => ({
	album: one(albums, {
		fields: [albumArtists.albumId],
		references: [albums.spotifyId],
	}),
	artist: one(artists, {
		fields: [albumArtists.artistId],
		references: [artists.spotifyId],
	}),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
	albumArtists: many(albumArtists),
}));

export const weeklyBatchesRelations = relations(weeklyBatches, ({ one }) => ({
	aiResponse: one(aiResponses, {
		fields: [weeklyBatches.aiResponseId],
		references: [aiResponses.id],
	}),
}));
