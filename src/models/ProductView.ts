// A product as shown on the product detail page.
export interface ProductView {
  slug: string;
  name: string;
  descriptionParagraphs: string[];
  ingredients: string;
  allergens: string;
  unit: string;
  imageId: number | null;
  priceLabel: string;
  weekStatusLabel: string;
  isSoldOut: boolean;
}
