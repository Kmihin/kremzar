// A product row of the order form. max is the most that can be ordered:
// the remaining stock, at most 20. error is set when the typed quantity is
// above max.
export interface OrderFormRow {
  roundProductId: number;
  name: string;
  unit: string;
  priceCents: number;
  priceLabel: string;
  availabilityLabel: string;
  isSoldOut: boolean;
  max: number;
  quantity: string;
  error: string | null;
}
