// The photo part of a posted form: a new photo with the size the browser
// measured, or a request to remove the current one.
export interface ImageFormInput {
  image: File | null;
  imageWidth: number | null;
  imageHeight: number | null;
  removeImage: boolean;
}
