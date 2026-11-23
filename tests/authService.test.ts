import { describe, expect, it } from "vitest";
import { isCorrectPassword } from "../src/services/authService";

// ADMIN_PASSWORD comes from the test bindings in vitest.config.ts.
describe("isCorrectPassword", () => {
  it("accepts only the configured password", async () => {
    expect(await isCorrectPassword("test-password-for-vitest")).toBe(true);
    expect(await isCorrectPassword("test-password-for-vitesT")).toBe(false);
    expect(await isCorrectPassword("test-password")).toBe(false);
    expect(await isCorrectPassword("")).toBe(false);
  });
});
