import type { OfferProduct } from "./OfferProduct";

// The open round, if there is one, with its products.
export interface Offer {
  isOpen: boolean;
  products: OfferProduct[];
}
