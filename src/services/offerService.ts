import { findOpenRound, listOpenRoundProducts } from "../db/roundRepository";
import type { Availability } from "../models/Availability";
import type { Offer } from "../models/Offer";
import type { OfferProduct } from "../models/OfferProduct";
import type { ProductCardView } from "../models/ProductCardView";
import type { StripItem } from "../models/StripItem";
import { formatPrice } from "./formatService";

export async function loadOffer(): Promise<Offer> {
  const round = await findOpenRound();
  if (round === null) {
    return { isOpen: false, products: [] };
  }
  const products = await listOpenRoundProducts();
  return { isOpen: true, products };
}

// Short availability text, for badges and the availability strip.
export function availabilityOf(product: OfferProduct): Availability {
  if (product.remaining === null) {
    return { label: "Na voljo", isSoldOut: false };
  }
  if (product.remaining <= 0) {
    return { label: "Razprodano", isSoldOut: true };
  }
  return { label: `Še ${product.remaining}`, isSoldOut: false };
}

export function toStripItems(products: OfferProduct[]): StripItem[] {
  return products.map(toStripItem);
}

export function toOfferCards(products: OfferProduct[]): ProductCardView[] {
  return products.map(toOfferCard);
}

function toStripItem(product: OfferProduct): StripItem {
  const availability = availabilityOf(product);
  return {
    name: product.name,
    availabilityLabel: availability.label,
  };
}

function toOfferCard(product: OfferProduct): ProductCardView {
  const availability = availabilityOf(product);
  return {
    slug: product.slug,
    name: product.name,
    unit: product.unit,
    imageId: product.imageId,
    priceLabel: formatPrice(product.priceCents),
    availabilityLabel: availability.label,
    isSoldOut: availability.isSoldOut,
  };
}
