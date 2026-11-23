import { ErrorCode } from "../consts/errorCodes";
import {
  findProductById,
  insertProduct,
  isSlugTaken,
  listAllProducts,
  updateProduct,
} from "../db/productRepository";
import type { ImageFormInput } from "../models/ImageFormInput";
import type { Product } from "../models/Product";
import type { ProductFormValues } from "../models/ProductFormValues";
import type { ProductInput } from "../models/ProductInput";
import { formatPriceInput, parsePriceToCents, slugify } from "./formatService";
import { applyImageForm, deleteReplacedImage } from "./imageService";

export async function listProductsForAdmin(): Promise<Product[]> {
  return listAllProducts();
}

export async function findProductForAdmin(id: number): Promise<Product | null> {
  return findProductById(id);
}

// Returns an error code, or null when the product was saved.
export async function createProduct(
  values: ProductFormValues,
  imageForm: ImageFormInput,
): Promise<string | null> {
  const input = toProductInput(values);
  if (await isSlugTaken(input.slug, 0)) {
    return ErrorCode.slugTaken;
  }
  const image = await applyImageForm(null, imageForm);
  if (!image.isValid) {
    return ErrorCode.imageInvalid;
  }
  await insertProduct(input, image.imageId);
  return null;
}

// Returns an error code, or null when the product was saved. A new photo
// replaces the old one, which is then deleted.
export async function saveProduct(
  id: number,
  values: ProductFormValues,
  imageForm: ImageFormInput,
): Promise<string | null> {
  const product = await findProductById(id);
  if (product === null) {
    return ErrorCode.notFound;
  }
  const input = toProductInput(values);
  if (await isSlugTaken(input.slug, id)) {
    return ErrorCode.slugTaken;
  }
  const image = await applyImageForm(product.imageId, imageForm);
  if (!image.isValid) {
    return ErrorCode.imageInvalid;
  }
  await updateProduct(id, input, image.imageId);
  await deleteReplacedImage(product.imageId, image.imageId);
  return null;
}

export function emptyProductFormValues(): ProductFormValues {
  return {
    name: "",
    slug: "",
    description: "",
    ingredients: "",
    allergens: "",
    unit: "",
    price: "",
    sortOrder: "0",
    isActive: true,
  };
}

export function productFormValuesFromProduct(
  product: Product,
): ProductFormValues {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    ingredients: product.ingredients,
    allergens: product.allergens,
    unit: product.unit,
    price: formatPriceInput(product.priceCents),
    sortOrder: String(product.sortOrder),
    isActive: product.isActive === 1,
  };
}

// The values as posted, to show the form again with its errors.
export function productFormValuesFromForm(
  formData: FormData,
): ProductFormValues {
  return {
    name: textOf(formData, "name"),
    slug: textOf(formData, "slug"),
    description: textOf(formData, "description"),
    ingredients: textOf(formData, "ingredients"),
    allergens: textOf(formData, "allergens"),
    unit: textOf(formData, "unit"),
    price: textOf(formData, "price"),
    sortOrder: textOf(formData, "sortOrder"),
    isActive: formData.has("isActive"),
  };
}

function toProductInput(values: ProductFormValues): ProductInput {
  return {
    slug: values.slug === "" ? slugify(values.name) : values.slug,
    name: values.name,
    description: values.description,
    ingredients: values.ingredients,
    allergens: values.allergens,
    unit: values.unit,
    priceCents: parsePriceToCents(values.price),
    sortOrder: Number(values.sortOrder),
    isActive: values.isActive ? 1 : 0,
  };
}

function textOf(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}
