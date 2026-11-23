import { ErrorCode } from "../consts/errorCodes";
import { OrderStatus } from "../consts/statuses";
import {
  findAdminOrder,
  listOrderItems,
  listRoundOrders,
  updateOrderItems,
  updateOrderPaid,
  updateOrderStatus,
} from "../db/orderRepository";
import {
  findLatestRound,
  findOpenRound,
  findRoundById,
  listRounds,
} from "../db/roundRepository";
import type { AdminOrderDetail } from "../models/AdminOrderDetail";
import type { AdminOrderList } from "../models/AdminOrderList";
import type { ItemQuantityChange } from "../models/ItemQuantityChange";
import type { OrderItemsInput } from "../models/OrderItemsInput";
import type { Round } from "../models/Round";
import type { SelectOption } from "../models/SelectOption";

// Which status an order may move to from its current one. A cancelled order
// stays cancelled: its stock may already be sold again.
const allowedStatusChanges: Record<string, string[]> = {
  [OrderStatus.new]: [OrderStatus.delivered, OrderStatus.cancelled],
  [OrderStatus.delivered]: [OrderStatus.new],
  [OrderStatus.cancelled]: [],
};

export const orderStatusOptions: SelectOption[] = [
  { value: "", label: "Vsa" },
  { value: OrderStatus.new, label: "Nova" },
  { value: OrderStatus.delivered, label: "Dostavljena" },
  { value: OrderStatus.cancelled, label: "Preklicana" },
];

export function orderStatusLabel(status: string): string {
  if (status === OrderStatus.delivered) {
    return "Dostavljeno";
  }
  if (status === OrderStatus.cancelled) {
    return "Preklicano";
  }
  return "Novo";
}

// The orders of the requested round (default: the open round, else the
// newest), filtered by status ("" for all).
export async function loadOrderList(
  requestedRoundId: number,
  requestedStatus: string,
): Promise<AdminOrderList> {
  const rounds = await listRounds();
  let round = Number.isInteger(requestedRoundId)
    ? await findRoundById(requestedRoundId)
    : null;
  if (round === null) {
    round = await findOpenRound();
  }
  if (round === null) {
    round = await findLatestRound();
  }
  const isKnownStatus = orderStatusOptions.some(
    (option) => option.value === requestedStatus,
  );
  const status = isKnownStatus ? requestedStatus : "";
  const orders = round === null ? [] : await listRoundOrders(round.id, status);
  return { round, status, roundOptions: rounds.map(toRoundOption), orders };
}

function toRoundOption(round: Round): SelectOption {
  return { value: String(round.id), label: round.title };
}

export async function findOrderForAdmin(
  id: number,
): Promise<AdminOrderDetail | null> {
  const order = await findAdminOrder(id);
  if (order === null) {
    return null;
  }
  const items = await listOrderItems(id);
  return { order, items };
}

// Returns an error code, or null when the status was changed.
export async function changeOrderStatus(
  orderId: number,
  toStatus: string,
): Promise<string | null> {
  const order = await findAdminOrder(orderId);
  if (order === null) {
    return ErrorCode.notFound;
  }
  const allowed = allowedStatusChanges[order.status] ?? [];
  if (!allowed.includes(toStatus)) {
    return ErrorCode.orderStatusChange;
  }
  if (!(await updateOrderStatus(orderId, order.status, toStatus))) {
    return ErrorCode.orderStatusChange;
  }
  return null;
}

// Returns an error code, or null when the order was updated.
export async function setOrderPaid(
  orderId: number,
  isPaid: boolean,
): Promise<string | null> {
  if (!(await updateOrderPaid(orderId, isPaid ? 1 : 0))) {
    return ErrorCode.notFound;
  }
  return null;
}

// Saves changed quantities of a new order. Returns an error code, or null
// when every change was saved.
export async function saveOrderQuantities(
  input: OrderItemsInput,
): Promise<string | null> {
  const order = await findAdminOrder(input.orderId);
  if (order === null) {
    return ErrorCode.notFound;
  }
  if (order.status !== OrderStatus.new) {
    return ErrorCode.orderNotEditable;
  }
  const items = await listOrderItems(input.orderId);
  if (
    input.itemId.length !== items.length ||
    input.quantity.length !== items.length
  ) {
    return ErrorCode.notFound;
  }
  if (input.quantity.every((quantity) => quantity === 0)) {
    return ErrorCode.orderWithoutItems;
  }

  const changes: ItemQuantityChange[] = [];
  for (const item of items) {
    const index = input.itemId.indexOf(item.id);
    if (index === -1) {
      return ErrorCode.notFound;
    }
    if (input.quantity[index] !== item.quantity) {
      changes.push({ itemId: item.id, quantity: input.quantity[index] });
    }
  }
  if (changes.length === 0) {
    return null;
  }
  const shortItemIds = await updateOrderItems(input.orderId, changes);
  if (shortItemIds.length > 0) {
    return ErrorCode.orderStockShort;
  }
  return null;
}
