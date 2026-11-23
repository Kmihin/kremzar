import { env } from "cloudflare:workers";
import type { GalleryItem } from "../models/GalleryItem";
import type { GalleryPhoto } from "../models/GalleryPhoto";

// Joins the image size (not the image bytes) so the page can reserve space.
export async function listGalleryItems(): Promise<GalleryItem[]> {
  const result = await env.DB.prepare(
    `SELECT GalleryPhoto.id, GalleryPhoto.imageId, GalleryPhoto.caption, GalleryPhoto.sortOrder,
       Image.width, Image.height
     FROM GalleryPhoto
     JOIN Image ON Image.id = GalleryPhoto.imageId
     ORDER BY GalleryPhoto.sortOrder, GalleryPhoto.id`,
  ).all<GalleryItem>();
  return result.results;
}

export async function findGalleryPhoto(
  id: number,
): Promise<GalleryPhoto | null> {
  return env.DB.prepare("SELECT * FROM GalleryPhoto WHERE id = ?")
    .bind(id)
    .first<GalleryPhoto>();
}

export async function insertGalleryPhoto(
  imageId: number,
  caption: string,
  sortOrder: number,
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO GalleryPhoto (imageId, caption, sortOrder) VALUES (?, ?, ?)",
  )
    .bind(imageId, caption, sortOrder)
    .run();
}

// Returns false when there is no photo with this id.
export async function updateGalleryPhoto(
  id: number,
  caption: string,
  sortOrder: number,
): Promise<boolean> {
  const result = await env.DB.prepare(
    "UPDATE GalleryPhoto SET caption = ?, sortOrder = ? WHERE id = ?",
  )
    .bind(caption, sortOrder, id)
    .run();
  return result.meta.changes > 0;
}

export async function deleteGalleryPhoto(id: number): Promise<void> {
  await env.DB.prepare("DELETE FROM GalleryPhoto WHERE id = ?").bind(id).run();
}
