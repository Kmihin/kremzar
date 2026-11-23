// A product of the open round with its remaining stock.
// stockLimit and remaining are null when the stock is unlimited.
export interface OfferProduct {
  roundProductId: number;
  slug: string;
  name: string;
  unit: string;
  imageId: number | null;
  priceCents: number;
  stockLimit: number | null;
  remaining: number | null;
}
