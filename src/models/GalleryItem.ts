// A gallery photo together with the size of its image, for the gallery page.
export interface GalleryItem {
  id: number;
  imageId: number;
  caption: string;
  sortOrder: number;
  width: number;
  height: number;
}
