import { ErrorCode } from "../consts/errorCodes";
import {
  deleteGalleryPhoto,
  findGalleryPhoto,
  insertGalleryPhoto,
  updateGalleryPhoto,
} from "../db/galleryRepository";
import type { ImageFormInput } from "../models/ImageFormInput";
import { applyImageForm, deleteImageById } from "./imageService";

// Returns an error code, or null when the photo was added.
export async function addGalleryPhoto(
  caption: string,
  sortOrder: number,
  imageForm: ImageFormInput,
): Promise<string | null> {
  const image = await applyImageForm(null, imageForm);
  if (!image.isValid || image.imageId === null) {
    return ErrorCode.imageInvalid;
  }
  await insertGalleryPhoto(image.imageId, caption, sortOrder);
  return null;
}

// Returns an error code, or null when the photo was saved.
export async function saveGalleryPhoto(
  id: number,
  caption: string,
  sortOrder: number,
): Promise<string | null> {
  if (!(await updateGalleryPhoto(id, caption, sortOrder))) {
    return ErrorCode.notFound;
  }
  return null;
}

// Deletes the photo and its image.
export async function removeGalleryPhoto(id: number): Promise<string | null> {
  const photo = await findGalleryPhoto(id);
  if (photo === null) {
    return ErrorCode.notFound;
  }
  await deleteGalleryPhoto(id);
  await deleteImageById(photo.imageId);
  return null;
}
