import { describe, expect, it } from "vitest";
import { ImageType, maxImageBytes } from "../src/consts/images";
import {
  deleteImageById,
  findImageForMedia,
  storeImage,
} from "../src/services/imageService";

// Random bytes behind the given file signature.
function bytesWith(signature: number[], size: number): Uint8Array<ArrayBuffer> {
  const data = new Uint8Array(size);
  for (let offset = 0; offset < size; offset += 65536) {
    crypto.getRandomValues(data.subarray(offset, offset + 65536));
  }
  data.set(signature);
  return data;
}

const jpeg = [0xff, 0xd8, 0xff, 0xe0];
// "RIFF", four size bytes, "WEBP"
const webp = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];
const png = [0x89, 0x50, 0x4e, 0x47];

function upload(data: Uint8Array<ArrayBuffer>, width = 1600, height = 1200) {
  return { file: new File([data], "slika"), width, height };
}

describe("storeImage and findImageForMedia", () => {
  it("round-trips an image of the maximum size unchanged", async () => {
    const data = bytesWith(jpeg, maxImageBytes);

    const id = await storeImage(upload(data));
    if (id === null) {
      throw new Error("The image was refused.");
    }
    const image = await findImageForMedia(id);

    expect(image?.contentType).toBe(ImageType.jpeg);
    expect(image?.data.length).toBe(maxImageBytes);
    expect(image?.data).toEqual(data);
  });

  it("takes the type from the bytes", async () => {
    const id = await storeImage(upload(bytesWith(webp, 1000)));
    if (id === null) {
      throw new Error("The image was refused.");
    }

    expect((await findImageForMedia(id))?.contentType).toBe(ImageType.webp);
  });

  it("refuses other types, larger files and larger sizes", async () => {
    expect(await storeImage(upload(bytesWith(png, 1000)))).toBeNull();
    expect(
      await storeImage(upload(bytesWith(jpeg, maxImageBytes + 1))),
    ).toBeNull();
    expect(await storeImage(upload(bytesWith(jpeg, 1000), 1601))).toBeNull();
    expect(await storeImage(upload(bytesWith(jpeg, 1000), 800, 0))).toBeNull();
  });

  it("deletes an image", async () => {
    const id = await storeImage(upload(bytesWith(jpeg, 1000)));
    if (id === null) {
      throw new Error("The image was refused.");
    }

    await deleteImageById(id);

    expect(await findImageForMedia(id)).toBeNull();
  });
});
