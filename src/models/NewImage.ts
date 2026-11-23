// An image to store: the bytes, their content type and the pixel size.
export interface NewImage {
  contentType: string;
  data: Uint8Array;
  width: number;
  height: number;
  createdAt: string;
}
