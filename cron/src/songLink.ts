import { Effect, Schema, Console } from "effect";
import { HttpClient, HttpClientRequest } from "@effect/platform";

const PlatformLink = Schema.Struct({
  country: Schema.String,
  url: Schema.String,
  nativeAppUriMobile: Schema.optional(Schema.String),
  nativeAppUriDesktop: Schema.optional(Schema.String),
  entityUniqueId: Schema.String,
});

const SongLinkResponse = Schema.Struct({
  entityUniqueId: Schema.String,
  userCountry: Schema.String,
  pageUrl: Schema.String,
  linksByPlatform: Schema.Struct({
    appleMusic: Schema.optional(PlatformLink),
    tidal: Schema.optional(PlatformLink),
    spotify: Schema.optional(PlatformLink),
  }),
});

export const getSongLinks = Effect.fn("songLink.getLinks")(function* (
  url: string,
) {
  const client = yield* HttpClient.HttpClient;

  const json = yield* HttpClientRequest.get(
    "https://api.song.link/v1-alpha.1/links",
  ).pipe(
    HttpClientRequest.setUrlParam("url", url),
    client.execute,
    Effect.flatMap((res) => res.json),
  );

  return yield* Schema.decodeUnknown(SongLinkResponse)(json);
});
