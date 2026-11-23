import { env } from "cloudflare:workers";
import type { Product } from "../models/Product";
import type { ProductInput } from "../models/ProductInput";

export async function listActiveProducts(): Promise<Product[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM Product WHERE isActive = 1 ORDER BY sortOrder, name",
  ).all<Product>();
  return result.results;
}

export async function findActiveProductBySlug(
  slug: string,
): Promise<Product | null> {
  return env.DB.prepare("SELECT * FROM Product WHERE slug = ? AND isActive = 1")
    .bind(slug)
    .first<Product>();
}

export async function listAllProducts(): Promise<Product[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM Product ORDER BY sortOrder, name",
  ).all<Product>();
  return result.results;
}

export async function findProductById(id: number): Promise<Product | null> {
  return env.DB.prepare("SELECT * FROM Product WHERE id = ?")
    .bind(id)
    .first<Product>();
}

// exceptId is the product being edited; 0 when creating a new product.
export async function isSlugTaken(
  slug: string,
  exceptId: number,
): Promise<boolean> {
  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM Product WHERE slug = ? AND id != ?",
  )
    .bind(slug, exceptId)
    .first<number>("count");
  return count !== 0;
}

export async function insertProduct(
  input: ProductInput,
  imageId: number | null,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO Product (slug, name, description, ingredients, allergens, unit, priceCents, sortOrder, isActive, imageId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      input.slug,
      input.name,
      input.description,
      input.ingredients,
      input.allergens,
      input.unit,
      input.priceCents,
      input.sortOrder,
      input.isActive,
      imageId,
    )
    .run();
}

// Returns false when there is no product with this id.
export async function updateProduct(
  id: number,
  input: ProductInput,
  imageId: number | null,
): Promise<boolean> {
  const result = await env.DB.prepare(
    `UPDATE Product
     SET slug = ?, name = ?, description = ?, ingredients = ?, allergens = ?, unit = ?, priceCents = ?, sortOrder = ?, isActive = ?, imageId = ?
     WHERE id = ?`,
  )
    .bind(
      input.slug,
      input.name,
      input.description,
      input.ingredients,
      input.allergens,
      input.unit,
      input.priceCents,
      input.sortOrder,
      input.isActive,
      imageId,
      id,
    )
    .run();
  return result.meta.changes > 0;
}
