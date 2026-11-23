import type { OrderItem } from "./OrderItem";
import type { OrderSummary } from "./OrderSummary";

// An order with its lines, for the confirmation page.
export interface OrderConfirmation {
  order: OrderSummary;
  items: OrderItem[];
}
