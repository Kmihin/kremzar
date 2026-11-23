import { listGalleryItems } from "../db/galleryRepository";
import type { GalleryItem } from "../models/GalleryItem";

export async function listGallery(): Promise<GalleryItem[]> {
  return listGalleryItems();
}
