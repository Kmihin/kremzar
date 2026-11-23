// A row of the Product table.
export interface Product {
  id: number;
  slug: string;
  name: string;
  description: string;
  ingredients: string;
  allergens: string;
  unit: string;
  priceCents: number;
  imageId: number | null;
  isActive: number;
  sortOrder: number;
}
