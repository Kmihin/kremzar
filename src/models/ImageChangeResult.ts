// The image id a record should point to after a form save. isValid is
// false when a new photo was refused; imageId is then meaningless.
export interface ImageChangeResult {
  imageId: number | null;
  isValid: boolean;
}
