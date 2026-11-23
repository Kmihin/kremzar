import type { APIRoute } from "astro";
import { findImageForMedia } from "../../services/imageService";

// Serves an uploaded image. Images never change (a replacement gets a new
// id), so browsers and the CDN may keep them for a year.
export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const image = Number.isInteger(id) ? await findImageForMedia(id) : null;
  if (image === null) {
    return new Response(null, { status: 404 });
  }
  return new Response(image.data, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
