import { describe, expect, it } from "vitest";
import { ErrorCode } from "../src/consts/errorCodes";
import { findActiveProductBySlug } from "../src/db/productRepository";
import type { ImageFormInput } from "../src/models/ImageFormInput";
import type { ProductFormValues } from "../src/models/ProductFormValues";
import {
  createProduct,
  emptyProductFormValues,
  saveProduct,
} from "../src/services/adminProductService";
import { findImageForMedia } from "../src/services/imageService";

const noImage: ImageFormInput = {
  image: null,
  imageWidth: null,
  imageHeight: null,
  removeImage: false,
};

function values(changes: Partial<ProductFormValues>): ProductFormValues {
  return {
    ...emptyProductFormValues(),
    unit: "1 l",
    price: "2,50",
    sortOrder: "1",
    isActive: true,
    ...changes,
  };
}

describe("createProduct", () => {
  it("makes the slug from the name when it is empty", async () => {
    expect(
      await createProduct(values({ name: "Kislo mleko" }), noImage),
    ).toBeNull();

    const product = await findActiveProductBySlug("kislo-mleko");
    expect(product?.name).toBe("Kislo mleko");
    expect(product?.priceCents).toBe(250);
  });

  it("refuses a slug that another product has", async () => {
    await createProduct(values({ name: "Skuta" }), noImage);

    expect(
      await createProduct(values({ name: "Druga", slug: "skuta" }), noImage),
    ).toBe(ErrorCode.slugTaken);
  });
});

describe("saveProduct", () => {
  it("keeps the product's own slug and reports a missing product", async () => {
    await createProduct(values({ name: "Maslo" }), noImage);
    const product = await findActiveProductBySlug("maslo");
    if (product === null) {
      throw new Error("The product was not created.");
    }

    expect(
      await saveProduct(
        product.id,
        values({ name: "Maslo", slug: "maslo" }),
        noImage,
      ),
    ).toBeNull();
    expect(await saveProduct(9999, values({ name: "Ni ga" }), noImage)).toBe(
      ErrorCode.notFound,
    );
  });
});

describe("product photos", () => {
  function photo(): ImageFormInput {
    const data = new Uint8Array(1000);
    data.set([0xff, 0xd8, 0xff, 0xe0]);
    return {
      image: new File([data], "slika.jpg"),
      imageWidth: 800,
      imageHeight: 1000,
      removeImage: false,
    };
  }

  async function imageIdOf(slug: string): Promise<number | null> {
    const product = await findActiveProductBySlug(slug);
    return product?.imageId ?? null;
  }

  it("replaces and removes a photo and deletes the old image", async () => {
    await createProduct(values({ name: "Kefir" }), photo());
    const product = await findActiveProductBySlug("kefir");
    const firstImageId = product?.imageId ?? null;
    if (product === null || firstImageId === null) {
      throw new Error("The product or its photo was not created.");
    }

    await saveProduct(product.id, values({ name: "Kefir" }), photo());
    const secondImageId = await imageIdOf("kefir");
    expect(secondImageId).not.toBeNull();
    expect(secondImageId).not.toBe(firstImageId);
    expect(await findImageForMedia(firstImageId)).toBeNull();

    await saveProduct(product.id, values({ name: "Kefir" }), noImage);
    expect(await imageIdOf("kefir")).toBe(secondImageId);

    await saveProduct(product.id, values({ name: "Kefir" }), {
      ...noImage,
      removeImage: true,
    });
    expect(await imageIdOf("kefir")).toBeNull();
    expect(await findImageForMedia(secondImageId ?? 0)).toBeNull();
  });

  it("refuses a file that is not a photo", async () => {
    const notAPhoto = { ...photo(), image: new File(["text"], "a.txt") };

    expect(await createProduct(values({ name: "Pinjenec" }), notAPhoto)).toBe(
      ErrorCode.imageInvalid,
    );
    expect(await findActiveProductBySlug("pinjenec")).toBeNull();
  });
});
