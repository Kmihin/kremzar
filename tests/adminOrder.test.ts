import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { ErrorCode } from "../src/consts/errorCodes";
import { OrderStatus } from "../src/consts/statuses";
import {
  changeOrderStatus,
  findOrderForAdmin,
  loadOrderList,
  saveOrderQuantities,
  setOrderPaid,
} from "../src/services/adminOrderService";
import { placeOrder } from "../src/services/orderService";

const now = "2026-11-23T12:00:00.000Z";

// Round 50 is open. Sir (round product 50) costs 850 with a limit of 5;
// Mleko (51) costs 150 without a limit. Order 50 has 2 Sir and 1 Mleko.
// Order 51 has 2 Sir, so 1 Sir is left.
beforeEach(async () => {
  await env.DB.batch([
    ...["OrderItem", "CustomerOrder", "RoundProduct", "Round", "Product"].map(
      (table) => env.DB.prepare(`DELETE FROM ${table}`),
    ),
    env.DB.prepare(
      "INSERT INTO Product (id, slug, name, description, ingredients, allergens, unit, priceCents, sortOrder) VALUES (50, 'sir', 'Sir', '', '', '', 'kos', 900, 1), (51, 'mleko', 'Mleko', '', '', '', '1 l', 150, 2)",
    ),
    env.DB.prepare(
      "INSERT INTO Round (id, title, deliveryInfo, status, createdAt) VALUES (50, 'Teden 3', '', 'open', ?)",
    ).bind(now),
    env.DB.prepare(
      "INSERT INTO RoundProduct (id, roundId, productId, priceCents, stockLimit) VALUES (50, 50, 50, 850, 5), (51, 50, 51, 150, NULL)",
    ),
    env.DB.prepare(
      "INSERT INTO CustomerOrder (id, publicCode, roundId, customerName, status, totalCents, createdAt) VALUES (50, 'a', 50, 'Ana', 'new', 1850, ?), (51, 'b', 50, 'Bor', 'new', 1700, ?)",
    ).bind(now, now),
    env.DB.prepare(
      "INSERT INTO OrderItem (id, orderId, roundProductId, productName, unit, unitPriceCents, quantity) VALUES (50, 50, 50, 'Sir', 'kos', 850, 2), (51, 50, 51, 'Mleko', '1 l', 150, 1), (52, 51, 50, 'Sir', 'kos', 850, 2)",
    ),
  ]);
});

async function quantitiesOf(orderId: number): Promise<number[][]> {
  const detail = await findOrderForAdmin(orderId);
  return (detail?.items ?? []).map((item) => [item.id, item.quantity]);
}

describe("saveOrderQuantities", () => {
  it("allows the stock left plus the line's own quantity, and recalculates the total", async () => {
    expect(
      await saveOrderQuantities({
        orderId: 50,
        itemId: [50, 51],
        quantity: [3, 4],
      }),
    ).toBeNull();

    const detail = await findOrderForAdmin(50);
    expect(await quantitiesOf(50)).toEqual([
      [50, 3],
      [51, 4],
    ]);
    expect(detail?.order.totalCents).toBe(3 * 850 + 4 * 150);
  });

  it("keeps a quantity the stock does not cover and saves the rest", async () => {
    expect(
      await saveOrderQuantities({
        orderId: 50,
        itemId: [50, 51],
        quantity: [4, 2],
      }),
    ).toBe(ErrorCode.orderStockShort);

    expect(await quantitiesOf(50)).toEqual([
      [50, 2],
      [51, 2],
    ]);
    expect((await findOrderForAdmin(50))?.order.totalCents).toBe(
      2 * 850 + 2 * 150,
    );
  });

  it("always allows a lower quantity, even below a lowered limit", async () => {
    await env.DB.prepare(
      "UPDATE RoundProduct SET stockLimit = 1 WHERE id = 50",
    ).run();

    expect(
      await saveOrderQuantities({
        orderId: 50,
        itemId: [50, 51],
        quantity: [1, 1],
      }),
    ).toBeNull();
    expect(await quantitiesOf(50)).toEqual([
      [50, 1],
      [51, 1],
    ]);
  });

  it("removes a line at quantity 0 but never the last one", async () => {
    expect(
      await saveOrderQuantities({
        orderId: 50,
        itemId: [50, 51],
        quantity: [0, 1],
      }),
    ).toBeNull();
    expect(await quantitiesOf(50)).toEqual([[51, 1]]);
    expect((await findOrderForAdmin(50))?.order.totalCents).toBe(150);

    expect(
      await saveOrderQuantities({ orderId: 50, itemId: [51], quantity: [0] }),
    ).toBe(ErrorCode.orderWithoutItems);
  });

  it("edits only new orders and only their own lines", async () => {
    expect(
      await saveOrderQuantities({
        orderId: 50,
        itemId: [52, 51],
        quantity: [1, 1],
      }),
    ).toBe(ErrorCode.notFound);

    await changeOrderStatus(50, OrderStatus.delivered);
    expect(
      await saveOrderQuantities({
        orderId: 50,
        itemId: [50, 51],
        quantity: [1, 1],
      }),
    ).toBe(ErrorCode.orderNotEditable);
  });
});

describe("changeOrderStatus and setOrderPaid", () => {
  it("follows the allowed status changes", async () => {
    expect(await changeOrderStatus(50, OrderStatus.delivered)).toBeNull();
    expect(await changeOrderStatus(50, OrderStatus.cancelled)).toBe(
      ErrorCode.orderStatusChange,
    );
    expect(await changeOrderStatus(50, OrderStatus.new)).toBeNull();
    expect(await changeOrderStatus(50, OrderStatus.cancelled)).toBeNull();
    expect(await changeOrderStatus(50, OrderStatus.new)).toBe(
      ErrorCode.orderStatusChange,
    );
    expect(await changeOrderStatus(999, OrderStatus.delivered)).toBe(
      ErrorCode.notFound,
    );
  });

  it("releases the stock of a cancelled order", async () => {
    const order = {
      name: "Cene",
      phone: "",
      website: "",
      publicCode: crypto.randomUUID(),
      roundProductId: [50],
      quantity: [3],
    };
    expect(await placeOrder(order)).toBe(ErrorCode.quantityTooHigh);

    await changeOrderStatus(51, OrderStatus.cancelled);

    expect(await placeOrder(order)).toBeNull();
  });

  it("marks an order paid and unpaid", async () => {
    await setOrderPaid(50, true);
    expect((await findOrderForAdmin(50))?.order.isPaid).toBe(1);
    await setOrderPaid(50, false);
    expect((await findOrderForAdmin(50))?.order.isPaid).toBe(0);
    expect(await setOrderPaid(999, true)).toBe(ErrorCode.notFound);
  });
});

describe("loadOrderList", () => {
  it("defaults to the open round and filters by status", async () => {
    await changeOrderStatus(51, OrderStatus.delivered);

    const all = await loadOrderList(Number.NaN, "");
    expect(all.round?.id).toBe(50);
    expect(all.orders.map((order) => order.id)).toEqual([50, 51]);

    const delivered = await loadOrderList(50, OrderStatus.delivered);
    expect(delivered.orders.map((order) => order.id)).toEqual([51]);

    const unknown = await loadOrderList(50, "x");
    expect(unknown.status).toBe("");
  });
});
