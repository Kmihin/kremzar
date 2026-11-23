import { ErrorCode, errorMessages } from "../consts/errorCodes";
import { publicCodePattern } from "../consts/publicCode";
import {
  deleteOrderByCode,
  findOrderSummary,
  insertOrder,
  isOrderCodeTaken,
  listOrderItems,
} from "../db/orderRepository";
import { findOpenRound, listOpenRoundProducts } from "../db/roundRepository";
import type { NewOrderItem } from "../models/NewOrderItem";
import type { OfferProduct } from "../models/OfferProduct";
import type { OrderConfirmation } from "../models/OrderConfirmation";
import type { OrderFormRow } from "../models/OrderFormRow";
import type { OrderFormValues } from "../models/OrderFormValues";
import type { OrderInput } from "../models/OrderInput";
import type { OrderOffer } from "../models/OrderOffer";
import { formatPrice } from "./formatService";

const maxPerProduct = 20;

export async function loadOrderOffer(): Promise<OrderOffer | null> {
  const round = await findOpenRound();
  if (round === null) {
    return null;
  }
  const products = await listOpenRoundProducts();
  return { round, products };
}

// The most of a product one order can take: the remaining stock, at most 20.
function maxQuantityOf(product: OfferProduct): number {
  if (product.remaining === null) {
    return maxPerProduct;
  }
  return Math.max(0, Math.min(product.remaining, maxPerProduct));
}

// Places the order (plan section 5, rules 3 and 4). Returns an error code,
// or null when the order exists under input.publicCode, including when it
// was placed by an earlier submit of the same form.
export async function placeOrder(input: OrderInput): Promise<string | null> {
  if (input.website !== "") {
    return ErrorCode.formRejected;
  }
  if (await isOrderCodeTaken(input.publicCode)) {
    return null;
  }
  const products = await listOpenRoundProducts();
  if (products.length === 0) {
    return ErrorCode.ordersClosed;
  }
  const errorCode = checkQuantities(input, products);
  if (errorCode !== null) {
    return errorCode;
  }

  const items = toOrderItems(input, products);
  const result = await insertOrder(
    {
      publicCode: input.publicCode,
      customerName: input.name,
      phone: input.phone === "" ? null : input.phone,
      totalCents: totalOf(items),
      createdAt: new Date().toISOString(),
    },
    items,
  );
  if (result.isDuplicateCode) {
    return null;
  }
  if (!result.isOrderInserted) {
    return ErrorCode.ordersClosed;
  }
  if (result.shortRoundProductIds.length > 0) {
    await deleteOrderByCode(input.publicCode);
    return ErrorCode.quantityTooHigh;
  }
  return null;
}

// Checks the posted rows against the server's copy of the offer.
function checkQuantities(
  input: OrderInput,
  products: OfferProduct[],
): string | null {
  const ids = input.roundProductId;
  if (
    ids.length !== input.quantity.length ||
    new Set(ids).size !== ids.length
  ) {
    return ErrorCode.formRejected;
  }
  let orderedCount = 0;
  for (let i = 0; i < ids.length; i++) {
    const quantity = input.quantity[i];
    if (quantity === 0) {
      continue;
    }
    const product = products.find((item) => item.roundProductId === ids[i]);
    if (product === undefined) {
      return ErrorCode.offerChanged;
    }
    if (quantity > maxQuantityOf(product)) {
      return ErrorCode.quantityTooHigh;
    }
    orderedCount++;
  }
  if (orderedCount === 0) {
    return ErrorCode.emptyOrder;
  }
  return null;
}

// The order lines, with name, unit and price from the server's offer.
// Call only after checkQuantities returned null.
function toOrderItems(
  input: OrderInput,
  products: OfferProduct[],
): NewOrderItem[] {
  const items: NewOrderItem[] = [];
  for (const product of products) {
    const index = input.roundProductId.indexOf(product.roundProductId);
    if (index === -1 || input.quantity[index] === 0) {
      continue;
    }
    items.push({
      roundProductId: product.roundProductId,
      productName: product.name,
      unit: product.unit,
      unitPriceCents: product.priceCents,
      quantity: input.quantity[index],
    });
  }
  return items;
}

function totalOf(items: NewOrderItem[]): number {
  let totalCents = 0;
  for (const item of items) {
    totalCents += item.unitPriceCents * item.quantity;
  }
  return totalCents;
}

// A fresh form with a new public code (plan section 5, rule 3).
export function emptyOrderFormValues(): OrderFormValues {
  return {
    name: "",
    phone: "",
    publicCode: crypto.randomUUID(),
    roundProductIds: [],
    quantities: [],
  };
}

// The form as posted. A valid public code is kept, so a repeated submit
// still finds the first order.
export function orderFormValuesFromForm(formData: FormData): OrderFormValues {
  const publicCode = String(formData.get("publicCode") ?? "");
  return {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    publicCode: publicCodePattern.test(publicCode)
      ? publicCode
      : crypto.randomUUID(),
    roundProductIds: formData.getAll("roundProductId").map(String),
    quantities: formData.getAll("quantity").map(String),
  };
}

export function orderFormRows(
  products: OfferProduct[],
  values: OrderFormValues,
): OrderFormRow[] {
  const rows: OrderFormRow[] = [];
  for (const product of products) {
    const index = values.roundProductIds.indexOf(
      String(product.roundProductId),
    );
    const quantity = index === -1 ? "0" : (values.quantities[index] ?? "0");
    rows.push(toOrderFormRow(product, quantity));
  }
  return rows;
}

function toOrderFormRow(product: OfferProduct, quantity: string): OrderFormRow {
  const max = maxQuantityOf(product);
  return {
    roundProductId: product.roundProductId,
    name: product.name,
    unit: product.unit,
    priceCents: product.priceCents,
    priceLabel: formatPrice(product.priceCents),
    availabilityLabel: availabilityLabelOf(product),
    isSoldOut: max === 0,
    max,
    quantity,
    error: Number(quantity) > max ? quantityErrorOf(max) : null,
  };
}

function availabilityLabelOf(product: OfferProduct): string {
  if (product.remaining === null) {
    return "Na voljo";
  }
  if (product.remaining <= 0) {
    return "Razprodano";
  }
  return `Še ${product.remaining} na voljo`;
}

function quantityErrorOf(max: number): string {
  if (max === 0) {
    return "Medtem je razprodano.";
  }
  return `Naročite lahko največ ${max}.`;
}

// The message above the form when the input is invalid. Name and phone show
// their own messages next to the fields. The hidden fields are wrong only on
// a stale or forged post.
export function orderInputErrorMessage(
  fieldErrors: Record<string, string[] | undefined>,
): string {
  if (fieldErrors.quantity !== undefined) {
    return fieldErrors.quantity[0];
  }
  if (fieldErrors.name !== undefined || fieldErrors.phone !== undefined) {
    return "Popravite označena polja.";
  }
  return errorMessages[ErrorCode.formRejected];
}

export async function findOrderConfirmation(
  publicCode: string,
): Promise<OrderConfirmation | null> {
  if (!publicCodePattern.test(publicCode)) {
    return null;
  }
  const order = await findOrderSummary(publicCode);
  if (order === null) {
    return null;
  }
  const items = await listOrderItems(order.id);
  return { order, items };
}
