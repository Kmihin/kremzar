import { env } from "cloudflare:workers";
import { OrderStatus, RoundStatus } from "../consts/statuses";
import type { AdminOrder } from "../models/AdminOrder";
import type { CustomerOrder } from "../models/CustomerOrder";
import type { ItemQuantityChange } from "../models/ItemQuantityChange";
import type { NewOrder } from "../models/NewOrder";
import type { NewOrderItem } from "../models/NewOrderItem";
import type { OrderInsertResult } from "../models/OrderInsertResult";
import type { OrderItem } from "../models/OrderItem";
import type { OrderSummary } from "../models/OrderSummary";
import type { RoundTotals } from "../models/RoundTotals";

const duplicateCodeError = "UNIQUE constraint failed: CustomerOrder.publicCode";

export async function getRoundTotals(roundId: number): Promise<RoundTotals> {
  const totals = await env.DB.prepare(
    `SELECT COUNT(*) AS orderCount,
       COALESCE(SUM(totalCents), 0) AS revenueCents,
       COALESCE(SUM(CASE WHEN isPaid = 1 THEN totalCents ELSE 0 END), 0) AS paidCents
     FROM CustomerOrder
     WHERE roundId = ? AND status != ?`,
  )
    .bind(roundId, OrderStatus.cancelled)
    .first<RoundTotals>();
  if (totals === null) {
    throw new Error("An aggregate query returned no row");
  }
  return totals;
}

export async function isOrderCodeTaken(publicCode: string): Promise<boolean> {
  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM CustomerOrder WHERE publicCode = ?",
  )
    .bind(publicCode)
    .first<number>("count");
  return count !== 0;
}

// Writes the order and its lines in one batch, which D1 runs as one
// transaction. The order is written only while a round is open. Each line is
// written only while its stock limit is null or the remaining stock covers
// the quantity, so two orders at the same moment cannot oversell. A used
// publicCode makes the whole batch fail, and nothing is written.
export async function insertOrder(
  order: NewOrder,
  items: NewOrderItem[],
): Promise<OrderInsertResult> {
  const orderStatement = env.DB.prepare(
    `INSERT INTO CustomerOrder (publicCode, roundId, customerName, phone, status, isPaid, totalCents, createdAt)
     SELECT ?, id, ?, ?, ?, 0, ?, ? FROM Round WHERE status = ?`,
  ).bind(
    order.publicCode,
    order.customerName,
    order.phone,
    OrderStatus.new,
    order.totalCents,
    order.createdAt,
    RoundStatus.open,
  );
  const itemStatements = items.map((item) =>
    env.DB.prepare(
      `INSERT INTO OrderItem (orderId, roundProductId, productName, unit, unitPriceCents, quantity)
       SELECT CustomerOrder.id, RoundProduct.id, ?, ?, ?, ?
       FROM CustomerOrder
       JOIN RoundProduct ON RoundProduct.roundId = CustomerOrder.roundId
       WHERE CustomerOrder.publicCode = ? AND RoundProduct.id = ?
         AND (RoundProduct.stockLimit IS NULL OR RoundProduct.stockLimit - COALESCE((
           SELECT SUM(OrderItem.quantity)
           FROM OrderItem
           JOIN CustomerOrder AS PlacedOrder ON PlacedOrder.id = OrderItem.orderId
           WHERE OrderItem.roundProductId = RoundProduct.id AND PlacedOrder.status != ?
         ), 0) >= ?)`,
    ).bind(
      item.productName,
      item.unit,
      item.unitPriceCents,
      item.quantity,
      order.publicCode,
      item.roundProductId,
      OrderStatus.cancelled,
      item.quantity,
    ),
  );

  let results: D1Result[];
  try {
    results = await env.DB.batch([orderStatement, ...itemStatements]);
  } catch (error) {
    if (error instanceof Error && error.message.includes(duplicateCodeError)) {
      return {
        isDuplicateCode: true,
        isOrderInserted: false,
        shortRoundProductIds: [],
      };
    }
    throw error;
  }

  const shortRoundProductIds: number[] = [];
  for (let i = 0; i < items.length; i++) {
    if (results[i + 1].meta.changes === 0) {
      shortRoundProductIds.push(items[i].roundProductId);
    }
  }
  return {
    isDuplicateCode: false,
    isOrderInserted: results[0].meta.changes > 0,
    shortRoundProductIds,
  };
}

// The order's lines are deleted with it (ON DELETE CASCADE).
export async function deleteOrderByCode(publicCode: string): Promise<void> {
  await env.DB.prepare("DELETE FROM CustomerOrder WHERE publicCode = ?")
    .bind(publicCode)
    .run();
}

export async function findOrderSummary(
  publicCode: string,
): Promise<OrderSummary | null> {
  return env.DB.prepare(
    `SELECT CustomerOrder.id, CustomerOrder.publicCode, CustomerOrder.customerName,
       CustomerOrder.status, CustomerOrder.totalCents, CustomerOrder.createdAt,
       Round.title AS roundTitle, Round.deliveryInfo
     FROM CustomerOrder
     JOIN Round ON Round.id = CustomerOrder.roundId
     WHERE CustomerOrder.publicCode = ?`,
  )
    .bind(publicCode)
    .first<OrderSummary>();
}

export async function listOrderItems(orderId: number): Promise<OrderItem[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM OrderItem WHERE orderId = ? ORDER BY id",
  )
    .bind(orderId)
    .all<OrderItem>();
  return result.results;
}

// Orders of a round, oldest first. An empty status means all statuses.
export async function listRoundOrders(
  roundId: number,
  status: string,
): Promise<CustomerOrder[]> {
  const result = await env.DB.prepare(
    `SELECT * FROM CustomerOrder
     WHERE roundId = ? AND (? = '' OR status = ?)
     ORDER BY createdAt, id`,
  )
    .bind(roundId, status, status)
    .all<CustomerOrder>();
  return result.results;
}

export async function findAdminOrder(id: number): Promise<AdminOrder | null> {
  return env.DB.prepare(
    `SELECT CustomerOrder.id, CustomerOrder.roundId, Round.title AS roundTitle,
       CustomerOrder.customerName, CustomerOrder.phone, CustomerOrder.status,
       CustomerOrder.isPaid, CustomerOrder.totalCents, CustomerOrder.createdAt
     FROM CustomerOrder
     JOIN Round ON Round.id = CustomerOrder.roundId
     WHERE CustomerOrder.id = ?`,
  )
    .bind(id)
    .first<AdminOrder>();
}

// Changes the status only if it is still fromStatus. Cancelling releases
// the stock, because remaining stock never counts cancelled orders.
export async function updateOrderStatus(
  id: number,
  fromStatus: string,
  toStatus: string,
): Promise<boolean> {
  const result = await env.DB.prepare(
    "UPDATE CustomerOrder SET status = ? WHERE id = ? AND status = ?",
  )
    .bind(toStatus, id, fromStatus)
    .run();
  return result.meta.changes > 0;
}

export async function updateOrderPaid(
  id: number,
  isPaid: number,
): Promise<boolean> {
  const result = await env.DB.prepare(
    "UPDATE CustomerOrder SET isPaid = ? WHERE id = ?",
  )
    .bind(isPaid, id)
    .run();
  return result.meta.changes > 0;
}

// Sets new quantities in one batch and recalculates the total. A higher
// quantity is written only while the stock covers it (the same rule as a new
// order, without counting this line itself); a lower one always. Quantity 0
// removes the line. Returns the ids of the lines that did not fit.
export async function updateOrderItems(
  orderId: number,
  changes: ItemQuantityChange[],
): Promise<number[]> {
  const statements = changes.map((change) => {
    if (change.quantity === 0) {
      return env.DB.prepare(
        "DELETE FROM OrderItem WHERE id = ? AND orderId = ?",
      ).bind(change.itemId, orderId);
    }
    return env.DB.prepare(
      `UPDATE OrderItem SET quantity = ?
       WHERE id = ? AND orderId = ?
         AND (? <= quantity OR EXISTS (
           SELECT 1 FROM RoundProduct
           WHERE RoundProduct.id = OrderItem.roundProductId
             AND (RoundProduct.stockLimit IS NULL OR RoundProduct.stockLimit - COALESCE((
               SELECT SUM(Other.quantity)
               FROM OrderItem AS Other
               JOIN CustomerOrder ON CustomerOrder.id = Other.orderId
               WHERE Other.roundProductId = RoundProduct.id
                 AND CustomerOrder.status != ? AND Other.id != OrderItem.id
             ), 0) >= ?)
         ))`,
    ).bind(
      change.quantity,
      change.itemId,
      orderId,
      change.quantity,
      OrderStatus.cancelled,
      change.quantity,
    );
  });
  const totalStatement = env.DB.prepare(
    `UPDATE CustomerOrder
     SET totalCents = COALESCE((
       SELECT SUM(unitPriceCents * quantity) FROM OrderItem WHERE orderId = ?
     ), 0)
     WHERE id = ?`,
  ).bind(orderId, orderId);

  const results = await env.DB.batch([...statements, totalStatement]);
  const shortItemIds: number[] = [];
  for (let i = 0; i < changes.length; i++) {
    if (results[i].meta.changes === 0) {
      shortItemIds.push(changes[i].itemId);
    }
  }
  return shortItemIds;
}
