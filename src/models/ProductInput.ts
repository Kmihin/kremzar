// Validated values for creating or updating a product.
export interface ProductInput {
  slug: string;
  name: string;
  description: string;
  ingredients: string;
  allergens: string;
  unit: string;
  priceCents: number;
  sortOrder: number;
  isActive: number;
}
