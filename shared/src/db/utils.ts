import { customAlphabet } from "nanoid";

// https://planetscale.com/blog/why-we-chose-nanoids-for-planetscales-api
export const nanoid = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  12,
);
