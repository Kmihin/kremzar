import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const now = "2026-11-23T12:00:00.000Z";

describe("schema", () => {
  it("allows at most one open round", async () => {
    const insertRound = env.DB.prepare(
      "INSERT INTO Round (title, deliveryInfo, status, createdAt) VALUES (?, '', ?, ?)",
    );
    await insertRound.bind("Teden 1", "open", now).run();
    await insertRound.bind("Teden 2", "draft", now).run();

    const secondOpen = insertRound.bind("Teden 3", "open", now).run();

    await expect(secondOpen).rejects.toThrow(/UNIQUE constraint failed/);
  });

  it("deletes order items together with their order", async () => {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO Product (id, slug, name, description, ingredients, allergens, unit, priceCents) VALUES (10, 'mleko', 'Mleko', '', '', '', '1 l', 150)",
      ),
      env.DB.prepare(
        "INSERT INTO Round (id, title, deliveryInfo, status, createdAt) VALUES (10, 'Teden 10', '', 'closed', ?)",
      ).bind(now),
      env.DB.prepare(
        "INSERT INTO RoundProduct (id, roundId, productId, priceCents) VALUES (10, 10, 10, 150)",
      ),
      env.DB.prepare(
        "INSERT INTO CustomerOrder (id, publicCode, roundId, customerName, status, totalCents, createdAt) VALUES (10, 'code-10', 10, 'Ana', 'new', 300, ?)",
      ).bind(now),
      env.DB.prepare(
        "INSERT INTO OrderItem (orderId, roundProductId, productName, unit, unitPriceCents, quantity) VALUES (10, 10, 'Mleko', '1 l', 150, 2)",
      ),
    ]);

    await env.DB.prepare("DELETE FROM CustomerOrder WHERE id = 10").run();

    const itemCount = await env.DB.prepare(
      "SELECT COUNT(*) AS itemCount FROM OrderItem WHERE orderId = 10",
    ).first<number>("itemCount");
    expect(itemCount).toBe(0);
  });
});
