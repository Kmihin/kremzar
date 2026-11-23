import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { listOpenRoundProducts } from "../src/db/roundRepository";
import { availabilityOf } from "../src/services/offerService";
import type { OfferProduct } from "../src/models/OfferProduct";

const now = "2026-11-23T12:00:00.000Z";

describe("listOpenRoundProducts", () => {
  it("subtracts ordered quantities except cancelled orders", async () => {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO Product (id, slug, name, description, ingredients, allergens, unit, priceCents, sortOrder) VALUES (20, 'sir', 'Sir', '', '', '', 'kos', 900, 1), (21, 'mleko', 'Mleko', '', '', '', '1 l', 150, 2)",
      ),
      env.DB.prepare(
        "INSERT INTO Round (id, title, deliveryInfo, status, createdAt) VALUES (20, 'Teden', '', 'open', ?)",
      ).bind(now),
      env.DB.prepare(
        "INSERT INTO RoundProduct (id, roundId, productId, priceCents, stockLimit) VALUES (20, 20, 20, 900, 10), (21, 20, 21, 150, NULL)",
      ),
      env.DB.prepare(
        "INSERT INTO CustomerOrder (id, publicCode, roundId, customerName, status, totalCents, createdAt) VALUES (20, 'a', 20, 'Ana', 'new', 0, ?), (21, 'b', 20, 'Bor', 'cancelled', 0, ?)",
      ).bind(now, now),
      env.DB.prepare(
        "INSERT INTO OrderItem (orderId, roundProductId, productName, unit, unitPriceCents, quantity) VALUES (20, 20, 'Sir', 'kos', 900, 6), (21, 20, 'Sir', 'kos', 900, 3)",
      ),
    ]);

    const products = await listOpenRoundProducts();

    expect(
      products.map((product) => [product.slug, product.remaining]),
    ).toEqual([
      ["sir", 4],
      ["mleko", null],
    ]);
  });
});

describe("availabilityOf", () => {
  const base: OfferProduct = {
    roundProductId: 1,
    slug: "sir",
    name: "Sir",
    unit: "kos",
    imageId: null,
    priceCents: 900,
    stockLimit: 10,
    remaining: 4,
  };

  it("shows the remaining count for limited stock", () => {
    expect(availabilityOf(base)).toEqual({ label: "Še 4", isSoldOut: false });
  });

  it("shows sold out at zero or below", () => {
    expect(availabilityOf({ ...base, remaining: 0 })).toEqual({
      label: "Razprodano",
      isSoldOut: true,
    });
    expect(availabilityOf({ ...base, remaining: -2 }).isSoldOut).toBe(true);
  });

  it("shows available for unlimited stock", () => {
    expect(
      availabilityOf({ ...base, stockLimit: null, remaining: null }),
    ).toEqual({
      label: "Na voljo",
      isSoldOut: false,
    });
  });
});
