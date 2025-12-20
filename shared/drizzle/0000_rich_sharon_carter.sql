CREATE TABLE `ai_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt` text NOT NULL,
	`outputSchema` text NOT NULL,
	`model` text NOT NULL,
	`output` text NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `album_artists` (
	`albumId` text NOT NULL,
	`artistId` text NOT NULL,
	PRIMARY KEY(`albumId`, `artistId`),
	FOREIGN KEY (`albumId`) REFERENCES `albums`(`spotifyId`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`artistId`) REFERENCES `artists`(`spotifyId`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `album_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`aiResponseId` text,
	`albumId` text NOT NULL,
	`blurb` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`aiResponseId`) REFERENCES `ai_responses`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`albumId`) REFERENCES `albums`(`spotifyId`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `albums` (
	`spotifyId` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`releaseDate` text NOT NULL,
	`releaseDatePrecision` text NOT NULL,
	`appleMusicUrl` text,
	`tidalUrl` text,
	`spotifyUrl` text NOT NULL,
	`smallImageUrl` text NOT NULL,
	`mediumImageUrl` text NOT NULL,
	`largeImageUrl` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `artists` (
	`spotifyId` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `weekly_batches` (
	`weekId` text PRIMARY KEY NOT NULL,
	`aiResponseId` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`aiResponseId`) REFERENCES `ai_responses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_batches_aiResponseId_unique` ON `weekly_batches` (`aiResponseId`);