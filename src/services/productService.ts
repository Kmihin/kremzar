import {
  findActiveProductBySlug,
  listActiveProducts,
} from "../db/productRepository";
import type { Offer } from "../models/Offer";
import type { OfferProduct } from "../models/OfferProduct";
import type { Product } from "../models/Product";
import type { ProductCardView } from "../models/ProductCardView";
import type { ProductView } from "../models/ProductView";
import { formatPrice, splitParagraphs } from "./formatService";
import { availabilityOf } from "./offerService";

// All active products as cards. A product in the open round shows this
// week's price and availability; otherwise its regular price and no badge.
export async function listCatalogueCards(
  offer: Offer,
): Promise<ProductCardView[]> {
  const products = await listActiveProducts();
  const cards: ProductCardView[] = [];
  for (const product of products) {
    cards.push(toProductCard(product, findInOffer(offer, product.slug)));
  }
  return cards;
}

export async function findProduct(
  slug: string,
  offer: Offer,
): Promise<ProductView | null> {
  const product = await findActiveProductBySlug(slug);
  if (product === null) {
    return null;
  }
  return toProductView(product, offer, findInOffer(offer, slug));
}

function findInOffer(offer: Offer, slug: string): OfferProduct | null {
  return offer.products.find((item) => item.slug === slug) ?? null;
}

function toProductCard(
  product: Product,
  offerProduct: OfferProduct | null,
): ProductCardView {
  if (offerProduct === null) {
    return {
      slug: product.slug,
      name: product.name,
      unit: product.unit,
      imageId: product.imageId,
      priceLabel: formatPrice(product.priceCents),
      availabilityLabel: null,
      isSoldOut: false,
    };
  }
  const availability = availabilityOf(offerProduct);
  return {
    slug: product.slug,
    name: product.name,
    unit: product.unit,
    imageId: product.imageId,
    priceLabel: formatPrice(offerProduct.priceCents),
    availabilityLabel: availability.label,
    isSoldOut: availability.isSoldOut,
  };
}

function toProductView(
  product: Product,
  offer: Offer,
  offerProduct: OfferProduct | null,
): ProductView {
  const priceCents =
    offerProduct === null ? product.priceCents : offerProduct.priceCents;
  return {
    slug: product.slug,
    name: product.name,
    descriptionParagraphs: splitParagraphs(product.description),
    ingredients: product.ingredients,
    allergens: product.allergens,
    unit: product.unit,
    imageId: product.imageId,
    priceLabel: formatPrice(priceCents),
    weekStatusLabel: weekStatusLabel(offer, offerProduct),
    isSoldOut: offerProduct !== null && availabilityOf(offerProduct).isSoldOut,
  };
}

// Longer text for the "Ta teden" panel on the product page.
function weekStatusLabel(
  offer: Offer,
  offerProduct: OfferProduct | null,
): string {
  if (!offer.isOpen) {
    return "Naročila so zaprta";
  }
  if (offerProduct === null) {
    return "Ta teden ni v ponudbi";
  }
  if (offerProduct.remaining === null) {
    return "Na voljo";
  }
  if (offerProduct.remaining <= 0) {
    return "Razprodano";
  }
  return `Še ${offerProduct.remaining} na voljo`;
}
