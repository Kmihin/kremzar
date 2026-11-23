// Order totals of one round, counting only orders that are not cancelled.
export interface RoundTotals {
  orderCount: number;
  revenueCents: number;
  paidCents: number;
}
