// The bytes of a stored image and their content type, for /media/[id].
export interface ImageFile {
  contentType: string;
  data: Uint8Array<ArrayBuffer>;
}
