import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { ErrorCode } from "../src/consts/errorCodes";
import { closeRoundById } from "../src/services/adminRoundService";
import type { OrderInput } from "../src/models/OrderInput";
import {
  findOrderConfirmation,
  placeOrder,
} from "../src/services/orderService";

const now = "2026-11-23T12:00:00.000Z";

// Round 40 is open. Sir (round product 40) costs 850 in the round and has a
// limit of 5; Mleko (41) costs 150 without a limit. Round product 42 belongs
// to the closed round 41.
beforeEach(async () => {
  await env.DB.batch([
    ...["OrderItem", "CustomerOrder", "RoundProduct", "Round", "Product"].map(
      (table) => env.DB.prepare(`DELETE FROM ${table}`),
    ),
    env.DB.prepare(
      "INSERT INTO Product (id, slug, name, description, ingredients, allergens, unit, priceCents, sortOrder) VALUES (40, 'sir', 'Sir', '', '', '', 'kos', 900, 1), (41, 'mleko', 'Mleko', '', '', '', '1 l', 150, 2)",
    ),
    env.DB.prepare(
      "INSERT INTO Round (id, title, deliveryInfo, status, createdAt) VALUES (40, 'Teden 2', 'Torek', 'open', ?), (41, 'Teden 1', '', 'closed', ?)",
    ).bind(now, now),
    env.DB.prepare(
      "INSERT INTO RoundProduct (id, roundId, productId, priceCents, stockLimit) VALUES (40, 40, 40, 850, 5), (41, 40, 41, 150, NULL), (42, 41, 40, 800, NULL)",
    ),
  ]);
});

function order(changes: Partial<OrderInput>): OrderInput {
  return {
    name: "Ana Novak",
    phone: "",
    website: "",
    publicCode: crypto.randomUUID(),
    roundProductId: [40, 41],
    quantity: [1, 2],
    ...changes,
  };
}

async function orderCount(): Promise<number> {
  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM CustomerOrder",
  ).first<number>("count");
  return count ?? 0;
}

async function orderedQuantity(roundProductId: number): Promise<number> {
  const quantity = await env.DB.prepare(
    "SELECT COALESCE(SUM(quantity), 0) AS quantity FROM OrderItem WHERE roundProductId = ?",
  )
    .bind(roundProductId)
    .first<number>("quantity");
  return quantity ?? 0;
}

describe("placeOrder totals", () => {
  it("takes prices, names and units from the round, never from the form", async () => {
    const input = order({ phone: "041 123 456", quantity: [2, 3] });

    expect(await placeOrder(input)).toBeNull();

    const confirmation = await findOrderConfirmation(input.publicCode);
    expect(confirmation?.order.totalCents).toBe(2 * 850 + 3 * 150);
    expect(confirmation?.order.status).toBe("new");
    expect(
      confirmation?.items.map((item) => [
        item.productName,
        item.unit,
        item.unitPriceCents,
        item.quantity,
      ]),
    ).toEqual([
      ["Sir", "kos", 850, 2],
      ["Mleko", "1 l", 150, 3],
    ]);
  });

  it("leaves out rows with quantity 0", async () => {
    const input = order({ quantity: [0, 4] });

    await placeOrder(input);

    const confirmation = await findOrderConfirmation(input.publicCode);
    expect(confirmation?.items.map((item) => item.productName)).toEqual([
      "Mleko",
    ]);
    expect(confirmation?.order.totalCents).toBe(600);
  });
});

describe("placeOrder validation", () => {
  it("needs at least one product", async () => {
    expect(await placeOrder(order({ quantity: [0, 0] }))).toBe(
      ErrorCode.emptyOrder,
    );
  });

  it("allows at most the remaining stock and at most 20", async () => {
    expect(await placeOrder(order({ quantity: [6, 0] }))).toBe(
      ErrorCode.quantityTooHigh,
    );
    expect(await placeOrder(order({ quantity: [0, 21] }))).toBe(
      ErrorCode.quantityTooHigh,
    );
    expect(await placeOrder(order({ quantity: [5, 20] }))).toBeNull();
  });

  it("refuses a filled honeypot and malformed rows", async () => {
    expect(await placeOrder(order({ website: "http://spam" }))).toBe(
      ErrorCode.formRejected,
    );
    expect(await placeOrder(order({ quantity: [1] }))).toBe(
      ErrorCode.formRejected,
    );
    expect(
      await placeOrder(order({ roundProductId: [40, 40], quantity: [1, 1] })),
    ).toBe(ErrorCode.formRejected);
    expect(await orderCount()).toBe(0);
  });

  it("refuses a product that is not in the open round", async () => {
    expect(
      await placeOrder(order({ roundProductId: [42], quantity: [1] })),
    ).toBe(ErrorCode.offerChanged);
  });

  it("refuses orders while no round is open", async () => {
    await closeRoundById(40);

    expect(await placeOrder(order({}))).toBe(ErrorCode.ordersClosed);
    expect(await orderCount()).toBe(0);
  });
});

describe("placeOrder stock rule", () => {
  it("does not count cancelled orders", async () => {
    const first = order({ quantity: [5, 0] });
    await placeOrder(first);
    expect(await placeOrder(order({ quantity: [1, 0] }))).toBe(
      ErrorCode.quantityTooHigh,
    );

    await env.DB.prepare(
      "UPDATE CustomerOrder SET status = 'cancelled' WHERE publicCode = ?",
    )
      .bind(first.publicCode)
      .run();

    expect(await placeOrder(order({ quantity: [5, 0] }))).toBeNull();
  });

  // The three calls interleave: all of them pass the stock check in the
  // service before any of them writes, so the condition in the insert batch
  // is what refuses the second and third order.
  it("never oversells when orders arrive at the same moment", async () => {
    const results = await Promise.all([
      placeOrder(order({ quantity: [3, 1] })),
      placeOrder(order({ quantity: [3, 1] })),
      placeOrder(order({ quantity: [3, 1] })),
    ]);

    expect(results.filter((result) => result === null)).toHaveLength(1);
    expect(
      results.filter((result) => result === ErrorCode.quantityTooHigh),
    ).toHaveLength(2);
    expect(await orderedQuantity(40)).toBe(3);
    // The refused orders are deleted with their lines.
    expect(await orderCount()).toBe(1);
    expect(await orderedQuantity(41)).toBe(1);
  });
});

describe("placeOrder double submit", () => {
  it("does nothing for a repeated submit of the same form", async () => {
    const input = order({ quantity: [2, 1] });

    expect(await placeOrder(input)).toBeNull();
    expect(await placeOrder(input)).toBeNull();

    expect(await orderCount()).toBe(1);
    expect(await orderedQuantity(40)).toBe(2);
  });

  // Both calls find no order with the code and both send the batch; the
  // UNIQUE constraint makes the second batch fail as a whole.
  it("writes one order when the same form arrives twice at once", async () => {
    const input = order({ quantity: [2, 1] });

    const results = await Promise.all([placeOrder(input), placeOrder(input)]);

    expect(results).toEqual([null, null]);
    expect(await orderCount()).toBe(1);
    expect(await orderedQuantity(40)).toBe(2);
    expect(await orderedQuantity(41)).toBe(1);
  });
});

describe("findOrderConfirmation", () => {
  it("finds nothing for a malformed or unknown code", async () => {
    expect(await findOrderConfirmation("abc")).toBeNull();
    expect(await findOrderConfirmation(crypto.randomUUID())).toBeNull();
  });
});
