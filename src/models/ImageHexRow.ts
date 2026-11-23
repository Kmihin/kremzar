// An image read with SELECT hex(data); see imageRepository for why.
export interface ImageHexRow {
  contentType: string;
  dataHex: string;
}
