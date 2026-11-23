import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";

// Tests run inside workerd with a fresh local D1. The bindings are declared
// here instead of reading wrangler.jsonc, because its "main" is the Astro
// entrypoint package, which the test runner cannot load. Keep the
// compatibility settings and binding names equal to wrangler.jsonc.
export default defineConfig(async () => {
  const migrations = await readD1Migrations("./migrations");

  return {
    plugins: [
      cloudflareTest({
        miniflare: {
          compatibilityDate: "2026-11-15",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
          kvNamespaces: ["SESSION"],
          bindings: {
            TEST_MIGRATIONS: migrations,
            ADMIN_PASSWORD: "test-password-for-vitest",
          },
        },
      }),
    ],
    test: {
      include: ["tests/**/*.test.ts"],
      setupFiles: ["./tests/applyMigrations.ts"],
    },
  };
});
