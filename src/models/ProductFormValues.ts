// What the product form shows: text exactly as typed, so a form with errors
// keeps the values.
export interface ProductFormValues {
  name: string;
  slug: string;
  description: string;
  ingredients: string;
  allergens: string;
  unit: string;
  price: string;
  sortOrder: string;
  isActive: boolean;
}
