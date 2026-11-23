import type { OfferProduct } from "./OfferProduct";
import type { Round } from "./Round";

// The open round and its products, for the order form.
export interface OrderOffer {
  round: Round;
  products: OfferProduct[];
}
