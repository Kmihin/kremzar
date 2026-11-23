import type { CustomerOrder } from "./CustomerOrder";
import type { Round } from "./Round";
import type { SelectOption } from "./SelectOption";

// The admin order list: the chosen round and status filter, the rounds to
// choose from, and the matching orders.
export interface AdminOrderList {
  round: Round | null;
  status: string;
  roundOptions: SelectOption[];
  orders: CustomerOrder[];
}
