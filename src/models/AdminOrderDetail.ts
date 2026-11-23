import type { AdminOrder } from "./AdminOrder";
import type { OrderItem } from "./OrderItem";

// An order and its lines, for the admin order page.
export interface AdminOrderDetail {
  order: AdminOrder;
  items: OrderItem[];
}
