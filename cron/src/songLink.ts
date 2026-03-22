import { Context, Effect, Layer, Schedule, Schema } from "effect";
import {
	HttpClient,
	HttpClientRequest,
	HttpClientError,
} from "@effect/platform";
import { ParseError } from "effect/ParseResult";

const PlatformLink = Schema.Struct({
	country: Schema.optional(Schema.String),
	url: Schema.String,
	nativeAppUriMobile: Schema.optional(Schema.String),
	nativeAppUriDesktop: Schema.optional(Schema.String),
	entityUniqueId: Schema.optional(Schema.String),
});

const SongLinkResponse = Schema.Struct({
	entityUniqueId: Schema.optional(Schema.String),
	userCountry: Schema.optional(Schema.String),
	pageUrl: Schema.optional(Schema.String),
	linksByPlatform: Schema.Struct({
		appleMusic: Schema.optional(PlatformLink),
		tidal: Schema.optional(PlatformLink),
		spotify: Schema.optional(PlatformLink),
	}),
});

export type SongLinks = Schema.Schema.Type<typeof SongLinkResponse>;

const emptySongLinks: SongLinks = { linksByPlatform: {} };

export class SongLinkService extends Context.Tag("SongLinkService")<
	SongLinkService,
	{
		getLinks: (
			url: string,
		) => Effect.Effect<SongLinks, HttpClientError.HttpClientError>;
	}
>() {}

const retryTransient = Schedule.exponential("500 millis").pipe(
	Schedule.jittered,
	Schedule.intersect(Schedule.recurs(3)),
);

export const SongLinkServiceLive = Layer.effect(
	SongLinkService,
	Effect.gen(function* () {
		const client = yield* HttpClient.HttpClient;

		return {
			getLinks: Effect.fn("songLink.getLinks")(function* (url: string) {
				const json = yield* HttpClientRequest.get(
					"https://api.song.link/v1-alpha.1/links",
				).pipe(
					HttpClientRequest.setUrlParam("url", url),
					client.execute,
					Effect.flatMap((res) => res.json),
					Effect.retry(retryTransient),
				);

				return yield* Schema.decodeUnknown(SongLinkResponse)(json).pipe(
					Effect.tapError((e) =>
						Effect.logError("SongLink parse error", e.message),
					),
					Effect.catchTag("ParseError", () => Effect.succeed(emptySongLinks)),
				);
			}),
		};
	}),
);
