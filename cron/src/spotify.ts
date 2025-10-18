import { Config, Effect, Redacted, Schema, Option } from "effect";
import type { Album } from "./askForAlbums";
import { HttpClient, HttpClientRequest } from "@effect/platform";

const TokenResponse = Schema.Struct({
  access_token: Schema.String,
  token_type: Schema.String,
  expires_in: Schema.Number,
});

export const fetchAccessToken = Effect.fn("spotify.fetchAccessToken")(
  function* () {
    const client = yield* HttpClient.HttpClient;

    const clientId = yield* Config.redacted("SPOTIFY_CLIENT_ID");
    const clientSecret = yield* Config.redacted("SPOTIFY_CLIENT_SECRET");

    const json = yield* HttpClientRequest.post(
      "https://accounts.spotify.com/api/token",
    ).pipe(
      HttpClientRequest.bodyUrlParams({
        grant_type: "client_credentials",
        client_id: Redacted.value(clientId),
        client_secret: Redacted.value(clientSecret),
      }),
      client.execute,
      Effect.flatMap((res) => res.json),
    );

    const response = yield* Schema.decodeUnknown(TokenResponse)(json);

    return response.access_token;
  },
);

const SpotifySearchResponse = Schema.Struct({
  albums: Schema.Struct({
    items: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        external_urls: Schema.Struct({
          spotify: Schema.String,
        }),
        images: Schema.Array(
          Schema.Struct({
            height: Schema.Number,
            url: Schema.String,
            width: Schema.Number,
          }),
        ),
        artists: Schema.Array(
          Schema.Struct({
            name: Schema.String,
            id: Schema.String,
          }),
        ),
      }),
    ),
  }),
}).pipe(
  Schema.transform(
    Schema.Array(
      Schema.Struct({
        name: Schema.String,
        id: Schema.String,
        spotifyUrl: Schema.String,
        images: Schema.Array(
          Schema.Struct({
            height: Schema.Number,
            url: Schema.String,
            width: Schema.Number,
          }),
        ),
        artists: Schema.Array(
          Schema.Struct({ id: Schema.String, name: Schema.String }),
        ),
      }),
    ),
    {
      decode: (response) =>
        response.albums.items.map((item) => ({
          id: item.id,
          name: item.name,
          spotifyUrl: item.external_urls.spotify,
          artists: item.artists,
          images: item.images,
        })),
      encode: () => {
        throw new Error("Encoding not supported");
      },
    },
  ),
);

export const getSpotifyAlbum = Effect.fn("spotify.searchForAlbum")(function* (
  accessToken: string,
  album: Album,
) {
  const client = yield* HttpClient.HttpClient;

  const query = `album:${album.title} artist:${album.artist}`;

  const json = yield* HttpClientRequest.get(
    "https://api.spotify.com/v1/search",
  ).pipe(
    HttpClientRequest.setUrlParam("q", query),
    HttpClientRequest.setUrlParam("type", "album"),
    HttpClientRequest.bearerToken(accessToken),
    client.execute,
    Effect.flatMap((res) => res.json),
  );

  const response = yield* Schema.decodeUnknown(SpotifySearchResponse)(json);

  const firstResult = response[0];

  return Option.fromNullable(firstResult);
});
