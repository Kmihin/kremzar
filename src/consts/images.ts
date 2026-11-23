// Upload limits (plan section 8). The browser shrinks photos to fit before
// sending; the server checks again.
export const maxImageBytes = 500 * 1024;
export const maxImageSide = 1600;

export const ImageType = {
  webp: "image/webp",
  jpeg: "image/jpeg",
} as const;
