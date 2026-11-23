// One validated row of the round form.
export interface RoundLineInput {
  productId: number;
  isIncluded: boolean;
  priceCents: number;
  stockLimit: number | null;
}
