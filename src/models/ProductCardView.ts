// A product as shown on a product card.
export interface ProductCardView {
  slug: string;
  name: string;
  unit: string;
  imageId: number | null;
  priceLabel: string;
  availabilityLabel: string | null;
  isSoldOut: boolean;
}
