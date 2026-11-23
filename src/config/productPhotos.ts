import type { ImageMetadata } from "astro";
import processDairy from "../assets/photos/process-dairy.jpg";
import productBread from "../assets/photos/product-bread.jpg";
import productMilk from "../assets/photos/product-milk.jpg";
import productSkuta from "../assets/photos/product-skuta.jpg";
import productYogurt from "../assets/photos/product-yogurt.jpg";

// Placeholder photo per product slug, used until a photo is uploaded in the
// admin (M5). Products not listed here get the dairy photo.
const productPhotos: Record<string, ImageMetadata> = {
  mleko: productMilk,
  jogurt: productYogurt,
  sir: productSkuta,
  kruh: productBread,
};

export function productPhotoFor(slug: string): ImageMetadata {
  return productPhotos[slug] ?? processDairy;
}
