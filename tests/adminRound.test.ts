import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { ErrorCode } from "../src/consts/errorCodes";
import { RoundStatus } from "../src/consts/statuses";
import { findRoundById, listRoundLines } from "../src/db/roundRepository";
import type { RoundFormInput } from "../src/models/RoundFormInput";
import {
  closeRoundById,
  createRound,
  openRoundById,
  saveRoundForm,
} from "../src/services/adminRoundService";

const now = "2026-11-23T12:00:00.000Z";

// Storage is shared by the tests of one file, so each test starts empty.
beforeEach(async () => {
  await env.DB.batch(
    ["OrderItem", "CustomerOrder", "RoundProduct", "Round", "Product"].map(
      (table) => env.DB.prepare(`DELETE FROM ${table}`),
    ),
  );
});

// Products 30 and 31 are active, 32 is hidden. Round 30 is closed and offers
// product 30 at a round price with a limit.
async function addRoundData(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO Product (id, slug, name, description, ingredients, allergens, unit, priceCents, sortOrder, isActive) VALUES (30, 'sir', 'Sir', '', '', '', 'kos', 900, 1, 1), (31, 'mleko', 'Mleko', '', '', '', '1 l', 150, 2, 1), (32, 'skuta', 'Skuta', '', '', '', '250 g', 300, 3, 0)",
    ),
    env.DB.prepare(
      "INSERT INTO Round (id, title, deliveryInfo, status, createdAt) VALUES (30, 'Teden 1', '', 'closed', ?)",
    ).bind(now),
    env.DB.prepare(
      "INSERT INTO RoundProduct (id, roundId, productId, priceCents, stockLimit) VALUES (30, 30, 30, 850, 8)",
    ),
  ]);
}

async function includedProducts(roundId: number): Promise<number[][]> {
  const lines = await listRoundLines(roundId);
  return lines
    .filter((line) => line.roundProductId !== null)
    .map((line) => [
      line.productId,
      line.priceCents ?? 0,
      line.stockLimit ?? -1,
    ]);
}

describe("createRound", () => {
  it("copies products, prices and limits from the latest round", async () => {
    await addRoundData();

    const roundId = await createRound("Teden 2", "", true);

    expect((await findRoundById(roundId))?.status).toBe(RoundStatus.draft);
    expect(await includedProducts(roundId)).toEqual([[30, 850, 8]]);
  });

  it("otherwise adds every active product at its regular price", async () => {
    await addRoundData();

    const roundId = await createRound("Teden 2", "", false);

    expect(await includedProducts(roundId)).toEqual([
      [30, 900, -1],
      [31, 150, -1],
    ]);
  });
});

describe("saveRoundForm", () => {
  function form(changes: Partial<RoundFormInput>): RoundFormInput {
    return {
      roundId: 30,
      title: "Teden 1",
      deliveryInfo: "Torek",
      productId: [30, 31],
      includedProductIds: [30, 31],
      price: ["9", "1,60"],
      stockLimit: ["", "20"],
      ...changes,
    };
  }

  it("adds, updates and removes products of the round", async () => {
    await addRoundData();

    expect(await saveRoundForm(form({}))).toBeNull();
    expect(await includedProducts(30)).toEqual([
      [30, 900, -1],
      [31, 160, 20],
    ]);

    expect(await saveRoundForm(form({ includedProductIds: [31] }))).toBeNull();
    expect(await includedProducts(30)).toEqual([[31, 160, 20]]);
  });

  it("keeps a product that already has orders", async () => {
    await addRoundData();
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO CustomerOrder (id, publicCode, roundId, customerName, status, totalCents, createdAt) VALUES (30, 'c30', 30, 'Ana', 'new', 850, ?)",
      ).bind(now),
      env.DB.prepare(
        "INSERT INTO OrderItem (orderId, roundProductId, productName, unit, unitPriceCents, quantity) VALUES (30, 30, 'Sir', 'kos', 850, 1)",
      ),
    ]);

    await saveRoundForm(form({ includedProductIds: [31] }));

    expect((await includedProducts(30)).map((line) => line[0])).toEqual([
      30, 31,
    ]);
  });

  it("needs a price for every included product", async () => {
    await addRoundData();

    expect(await saveRoundForm(form({ price: ["", "1,60"] }))).toBe(
      ErrorCode.roundPriceMissing,
    );
    expect(await saveRoundForm(form({ roundId: 9999 }))).toBe(
      ErrorCode.notFound,
    );
  });
});

describe("openRoundById and closeRoundById", () => {
  it("keeps at most one round open", async () => {
    await addRoundData();
    const roundId = await createRound("Teden 2", "", true);

    expect(await openRoundById(30)).toBeNull();
    expect(await openRoundById(roundId)).toBeNull();

    expect((await findRoundById(30))?.status).toBe(RoundStatus.closed);
    expect((await findRoundById(roundId))?.status).toBe(RoundStatus.open);
  });

  it("leaves the open round alone when the round does not exist", async () => {
    await addRoundData();
    await openRoundById(30);

    expect(await openRoundById(9999)).toBe(ErrorCode.notFound);
    expect((await findRoundById(30))?.status).toBe(RoundStatus.open);
  });

  it("closes the round", async () => {
    await addRoundData();
    await openRoundById(30);

    expect(await closeRoundById(30)).toBeNull();
    expect((await findRoundById(30))?.status).toBe(RoundStatus.closed);
    expect(await closeRoundById(9999)).toBe(ErrorCode.notFound);
  });
});
