import { env } from "cloudflare:workers";
import type { ImageFile } from "../models/ImageFile";
import type { ImageHexRow } from "../models/ImageHexRow";
import type { NewImage } from "../models/NewImage";

// All image storage goes through this file, so the bytes can move to R2 or
// KV later without touching anything else (plan section 8).

// Returns the id of the new image.
export async function insertImage(image: NewImage): Promise<number> {
  const id = await env.DB.prepare(
    "INSERT INTO Image (contentType, data, width, height, createdAt) VALUES (?, ?, ?, ?, ?) RETURNING id",
  )
    .bind(
      image.contentType,
      image.data,
      image.width,
      image.height,
      image.createdAt,
    )
    .first<number>("id");
  if (id === null) {
    throw new Error("INSERT ... RETURNING returned no id");
  }
  return id;
}

export async function findImageFile(id: number): Promise<ImageFile | null> {
  // Hex, because D1 returns a BLOB as an array of numbers, which costs about
  // 5 ms of CPU at 500 KB; hex and fromHex cost about 0.5 ms (M0).
  const row = await env.DB.prepare(
    "SELECT contentType, hex(data) AS dataHex FROM Image WHERE id = ?",
  )
    .bind(id)
    .first<ImageHexRow>();
  if (row === null) {
    return null;
  }
  return {
    contentType: row.contentType,
    data: Uint8Array.fromHex(row.dataHex),
  };
}

export async function deleteImage(id: number): Promise<void> {
  await env.DB.prepare("DELETE FROM Image WHERE id = ?").bind(id).run();
}
