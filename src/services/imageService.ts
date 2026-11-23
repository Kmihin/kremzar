import { ImageType, maxImageBytes, maxImageSide } from "../consts/images";
import { deleteImage, findImageFile, insertImage } from "../db/imageRepository";
import type { ImageChangeResult } from "../models/ImageChangeResult";
import type { ImageFile } from "../models/ImageFile";
import type { ImageFormInput } from "../models/ImageFormInput";
import type { ImageUpload } from "../models/ImageUpload";

// Checks and stores an uploaded image. Returns the new image id, or null
// when the file is not a WebP or JPEG within the limits. The type comes from
// the file's first bytes, not from what the browser claims.
export async function storeImage(upload: ImageUpload): Promise<number | null> {
  if (upload.file.size > maxImageBytes || !isAllowedSize(upload)) {
    return null;
  }
  const data = new Uint8Array(await upload.file.arrayBuffer());
  const contentType = contentTypeOf(data);
  if (contentType === null) {
    return null;
  }
  return insertImage({
    contentType,
    data,
    width: upload.width,
    height: upload.height,
    createdAt: new Date().toISOString(),
  });
}

export async function findImageForMedia(id: number): Promise<ImageFile | null> {
  return findImageFile(id);
}

// Images are never changed, only replaced: the old one is deleted once
// nothing points to it.
export async function deleteImageById(id: number): Promise<void> {
  await deleteImage(id);
}

// Stores a newly posted photo, or works out the image a record keeps or
// loses. Call deleteReplacedImage once the record points to the result.
export async function applyImageForm(
  currentImageId: number | null,
  form: ImageFormInput,
): Promise<ImageChangeResult> {
  if (form.image !== null) {
    const imageId = await storeImage({
      file: form.image,
      width: form.imageWidth ?? 0,
      height: form.imageHeight ?? 0,
    });
    return { imageId, isValid: imageId !== null };
  }
  return { imageId: form.removeImage ? null : currentImageId, isValid: true };
}

export async function deleteReplacedImage(
  oldImageId: number | null,
  newImageId: number | null,
): Promise<void> {
  if (oldImageId !== null && oldImageId !== newImageId) {
    await deleteImage(oldImageId);
  }
}

function isAllowedSize(upload: ImageUpload): boolean {
  return (
    upload.width >= 1 &&
    upload.height >= 1 &&
    upload.width <= maxImageSide &&
    upload.height <= maxImageSide
  );
}

// JPEG starts with FF D8 FF; WebP with "RIFF", four size bytes, "WEBP".
function contentTypeOf(data: Uint8Array): string | null {
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return ImageType.jpeg;
  }
  const riff = new TextDecoder().decode(data.subarray(0, 4));
  const webp = new TextDecoder().decode(data.subarray(8, 12));
  if (riff === "RIFF" && webp === "WEBP") {
    return ImageType.webp;
  }
  return null;
}
