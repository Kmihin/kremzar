import { env } from "cloudflare:workers";

// Compares the SHA-256 digests of the given and the expected password. Both
// digests are 32 bytes, so timingSafeEqual never sees different lengths and
// the time taken does not depend on where the passwords differ.
export async function isCorrectPassword(password: string): Promise<boolean> {
  const given = await sha256(password);
  const expected = await sha256(env.ADMIN_PASSWORD);
  return crypto.subtle.timingSafeEqual(given, expected);
}

async function sha256(text: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
}
