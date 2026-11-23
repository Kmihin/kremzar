// A product as it stands in a round, for the admin: the round's price and
// limit (null when the product is not in the round), how much is ordered in
// orders that are not cancelled, and whether any order item points to it (0/1).
export interface RoundLine {
  productId: number;
  productName: string;
  unit: string;
  regularPriceCents: number;
  roundProductId: number | null;
  priceCents: number | null;
  stockLimit: number | null;
  orderedQuantity: number;
  hasOrderItems: number;
}
