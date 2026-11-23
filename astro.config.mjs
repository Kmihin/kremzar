// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  // Prerendered pages become kontakt.html instead of kontakt/index.html, so
  // Cloudflare serves /kontakt directly instead of redirecting to /kontakt/.
  build: { format: "file" },
  // Admin login only. 30 days in KV and in the cookie, so a login survives
  // closing the browser. Public pages never touch the session. Astro always
  // sets the session cookie httpOnly.
  session: {
    ttl: 60 * 60 * 24 * 30,
    cookie: {
      name: "kremzar-admin",
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    },
  },
  // Passthrough: no image processing at build time or at runtime (no Images binding).
  adapter: cloudflare({ imageService: "passthrough" }),
});
