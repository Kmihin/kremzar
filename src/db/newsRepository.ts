import { env } from "cloudflare:workers";
import type { NewsInput } from "../models/NewsInput";
import type { NewsPost } from "../models/NewsPost";
import type { PublishedNewsPost } from "../models/PublishedNewsPost";

export async function listPublishedNews(): Promise<PublishedNewsPost[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM NewsPost WHERE publishedAt IS NOT NULL ORDER BY publishedAt DESC",
  ).all<PublishedNewsPost>();
  return result.results;
}

export async function findPublishedNewsBySlug(
  slug: string,
): Promise<PublishedNewsPost | null> {
  return env.DB.prepare(
    "SELECT * FROM NewsPost WHERE slug = ? AND publishedAt IS NOT NULL",
  )
    .bind(slug)
    .first<PublishedNewsPost>();
}

export async function listAllNewsPosts(): Promise<NewsPost[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM NewsPost ORDER BY publishedAt IS NOT NULL, publishedAt DESC, id DESC",
  ).all<NewsPost>();
  return result.results;
}

export async function findNewsPostById(id: number): Promise<NewsPost | null> {
  return env.DB.prepare("SELECT * FROM NewsPost WHERE id = ?")
    .bind(id)
    .first<NewsPost>();
}

export async function isNewsSlugTaken(
  slug: string,
  exceptId: number,
): Promise<boolean> {
  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM NewsPost WHERE slug = ? AND id != ?",
  )
    .bind(slug, exceptId)
    .first<number>("count");
  return count !== 0;
}

export async function insertNewsPost(
  input: NewsInput,
  imageId: number | null,
  publishedAt: string | null,
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO NewsPost (slug, title, body, imageId, publishedAt) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(input.slug, input.title, input.body, imageId, publishedAt)
    .run();
}

export async function updateNewsPost(
  id: number,
  input: NewsInput,
  imageId: number | null,
  publishedAt: string | null,
): Promise<void> {
  await env.DB.prepare(
    "UPDATE NewsPost SET slug = ?, title = ?, body = ?, imageId = ?, publishedAt = ? WHERE id = ?",
  )
    .bind(input.slug, input.title, input.body, imageId, publishedAt, id)
    .run();
}

export async function deleteNewsPost(id: number): Promise<void> {
  await env.DB.prepare("DELETE FROM NewsPost WHERE id = ?").bind(id).run();
}
