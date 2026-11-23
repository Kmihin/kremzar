import { env } from "cloudflare:workers";
import { OrderStatus, RoundStatus } from "../consts/statuses";
import type { OfferProduct } from "../models/OfferProduct";
import type { Round } from "../models/Round";
import type { RoundLine } from "../models/RoundLine";
import type { RoundLineInput } from "../models/RoundLineInput";

export async function findOpenRound(): Promise<Round | null> {
  return env.DB.prepare("SELECT * FROM Round WHERE status = ?")
    .bind(RoundStatus.open)
    .first<Round>();
}

// Remaining stock is always computed from the orders, never stored:
// stockLimit minus the quantities in orders that are not cancelled.
export async function listOpenRoundProducts(): Promise<OfferProduct[]> {
  const result = await env.DB.prepare(
    `SELECT RoundProduct.id AS roundProductId, Product.slug, Product.name, Product.unit, Product.imageId,
       RoundProduct.priceCents, RoundProduct.stockLimit,
       RoundProduct.stockLimit - COALESCE((
         SELECT SUM(OrderItem.quantity)
         FROM OrderItem
         JOIN CustomerOrder ON CustomerOrder.id = OrderItem.orderId
         WHERE OrderItem.roundProductId = RoundProduct.id AND CustomerOrder.status != ?
       ), 0) AS remaining
     FROM RoundProduct
     JOIN Round ON Round.id = RoundProduct.roundId
     JOIN Product ON Product.id = RoundProduct.productId
     WHERE Round.status = ?
     ORDER BY Product.sortOrder, Product.name`,
  )
    .bind(OrderStatus.cancelled, RoundStatus.open)
    .all<OfferProduct>();
  return result.results;
}

export async function listRounds(): Promise<Round[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM Round ORDER BY createdAt DESC, id DESC",
  ).all<Round>();
  return result.results;
}

export async function findRoundById(id: number): Promise<Round | null> {
  return env.DB.prepare("SELECT * FROM Round WHERE id = ?")
    .bind(id)
    .first<Round>();
}

export async function findLatestRound(): Promise<Round | null> {
  return env.DB.prepare(
    "SELECT * FROM Round ORDER BY createdAt DESC, id DESC LIMIT 1",
  ).first<Round>();
}

// Returns the id of the new draft round.
export async function insertRound(
  title: string,
  deliveryInfo: string,
  createdAt: string,
): Promise<number> {
  const id = await env.DB.prepare(
    "INSERT INTO Round (title, deliveryInfo, status, createdAt) VALUES (?, ?, ?, ?) RETURNING id",
  )
    .bind(title, deliveryInfo, RoundStatus.draft, createdAt)
    .first<number>("id");
  if (id === null) {
    throw new Error("INSERT ... RETURNING returned no id");
  }
  return id;
}

export async function copyRoundProducts(
  fromRoundId: number,
  toRoundId: number,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO RoundProduct (roundId, productId, priceCents, stockLimit)
     SELECT ?, productId, priceCents, stockLimit FROM RoundProduct WHERE roundId = ?`,
  )
    .bind(toRoundId, fromRoundId)
    .run();
}

// Adds every active product at its regular price, without a limit.
export async function addActiveProducts(roundId: number): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO RoundProduct (roundId, productId, priceCents, stockLimit)
     SELECT ?, id, priceCents, NULL FROM Product WHERE isActive = 1`,
  )
    .bind(roundId)
    .run();
}

// Active products and products already in the round, with the round's price
// and limit and the ordered quantity.
export async function listRoundLines(roundId: number): Promise<RoundLine[]> {
  const result = await env.DB.prepare(
    `SELECT Product.id AS productId, Product.name AS productName, Product.unit,
       Product.priceCents AS regularPriceCents,
       RoundProduct.id AS roundProductId, RoundProduct.priceCents, RoundProduct.stockLimit,
       COALESCE((
         SELECT SUM(OrderItem.quantity)
         FROM OrderItem
         JOIN CustomerOrder ON CustomerOrder.id = OrderItem.orderId
         WHERE OrderItem.roundProductId = RoundProduct.id AND CustomerOrder.status != ?
       ), 0) AS orderedQuantity,
       EXISTS (
         SELECT 1 FROM OrderItem WHERE OrderItem.roundProductId = RoundProduct.id
       ) AS hasOrderItems
     FROM Product
     LEFT JOIN RoundProduct ON RoundProduct.productId = Product.id AND RoundProduct.roundId = ?
     WHERE Product.isActive = 1 OR RoundProduct.id IS NOT NULL
     ORDER BY Product.sortOrder, Product.name`,
  )
    .bind(OrderStatus.cancelled, roundId)
    .all<RoundLine>();
  return result.results;
}

// Saves the round's title, delivery info and products in one batch.
// A product is removed from the round only if no order item points to it.
export async function saveRound(
  roundId: number,
  title: string,
  deliveryInfo: string,
  lines: RoundLineInput[],
): Promise<void> {
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      "UPDATE Round SET title = ?, deliveryInfo = ? WHERE id = ?",
    ).bind(title, deliveryInfo, roundId),
  ];
  for (const line of lines) {
    if (line.isIncluded) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO RoundProduct (roundId, productId, priceCents, stockLimit) VALUES (?, ?, ?, ?)
           ON CONFLICT (roundId, productId) DO UPDATE SET priceCents = excluded.priceCents, stockLimit = excluded.stockLimit`,
        ).bind(roundId, line.productId, line.priceCents, line.stockLimit),
      );
    } else {
      statements.push(
        env.DB.prepare(
          `DELETE FROM RoundProduct WHERE roundId = ? AND productId = ?
           AND NOT EXISTS (SELECT 1 FROM OrderItem WHERE OrderItem.roundProductId = RoundProduct.id)`,
        ).bind(roundId, line.productId),
      );
    }
  }
  await env.DB.batch(statements);
}

// Opens the round and closes any other open round, in one batch.
export async function openRound(roundId: number, now: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE Round SET status = ?, closedAt = ? WHERE status = ? AND id != ?",
    ).bind(RoundStatus.closed, now, RoundStatus.open, roundId),
    env.DB.prepare(
      "UPDATE Round SET status = ?, closedAt = NULL WHERE id = ?",
    ).bind(RoundStatus.open, roundId),
  ]);
}

export async function closeRound(roundId: number, now: string): Promise<void> {
  await env.DB.prepare(
    "UPDATE Round SET status = ?, closedAt = ? WHERE id = ? AND status = ?",
  )
    .bind(RoundStatus.closed, now, roundId, RoundStatus.open)
    .run();
}
