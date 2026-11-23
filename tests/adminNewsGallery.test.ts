import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { ErrorCode } from "../src/consts/errorCodes";
import { listPublishedNews } from "../src/db/newsRepository";
import type { ImageFormInput } from "../src/models/ImageFormInput";
import type { NewsFormValues } from "../src/models/NewsFormValues";
import {
  addGalleryPhoto,
  removeGalleryPhoto,
  saveGalleryPhoto,
} from "../src/services/adminGalleryService";
import {
  createNews,
  deleteNews,
  listNewsForAdmin,
  saveNews,
} from "../src/services/adminNewsService";
import { listGallery } from "../src/services/galleryService";
import { findImageForMedia } from "../src/services/imageService";

const noImage: ImageFormInput = {
  image: null,
  imageWidth: null,
  imageHeight: null,
  removeImage: false,
};

function photo(): ImageFormInput {
  const data = new Uint8Array(1000);
  data.set([0xff, 0xd8, 0xff, 0xe0]);
  return {
    image: new File([data], "slika.jpg"),
    imageWidth: 1200,
    imageHeight: 800,
    removeImage: false,
  };
}

function news(changes: Partial<NewsFormValues>): NewsFormValues {
  return {
    title: "Telički",
    slug: "",
    body: "Rodila sta se dva telička.",
    isPublished: true,
    ...changes,
  };
}

beforeEach(async () => {
  await env.DB.batch(
    ["GalleryPhoto", "NewsPost", "Image"].map((table) =>
      env.DB.prepare(`DELETE FROM ${table}`),
    ),
  );
});

describe("news admin", () => {
  it("publishes with today's date, keeps it, and unpublishes", async () => {
    expect(await createNews(news({}), noImage)).toBeNull();
    const [post] = await listNewsForAdmin();
    expect(post.slug).toBe("telicki");
    expect(post.publishedAt).not.toBeNull();

    await saveNews(post.id, news({ title: "Telički na paši" }), noImage);
    const [kept] = await listNewsForAdmin();
    expect(kept.title).toBe("Telički na paši");
    expect(kept.publishedAt).toBe(post.publishedAt);

    await saveNews(post.id, news({ isPublished: false }), noImage);
    expect(await listPublishedNews()).toEqual([]);
  });

  it("refuses a slug another post has", async () => {
    await createNews(news({}), noImage);

    expect(
      await createNews(news({ title: "Drugo", slug: "telicki" }), noImage),
    ).toBe(ErrorCode.newsSlugTaken);
  });

  it("deletes a post with its photo", async () => {
    await createNews(news({}), photo());
    const [post] = await listNewsForAdmin();
    const imageId = post.imageId ?? 0;
    expect(await findImageForMedia(imageId)).not.toBeNull();

    expect(await deleteNews(post.id)).toBeNull();

    expect(await listNewsForAdmin()).toEqual([]);
    expect(await findImageForMedia(imageId)).toBeNull();
    expect(await deleteNews(post.id)).toBe(ErrorCode.notFound);
  });
});

describe("gallery admin", () => {
  it("adds, edits and deletes a photo with its image", async () => {
    expect(await addGalleryPhoto("Krave na paši", 2, photo())).toBeNull();
    expect(await addGalleryPhoto("Hlev", 1, photo())).toBeNull();

    const items = await listGallery();
    expect(items.map((item) => item.caption)).toEqual([
      "Hlev",
      "Krave na paši",
    ]);
    expect(items[0].width).toBe(1200);

    await saveGalleryPhoto(items[1].id, "Krave", 0);
    expect((await listGallery()).map((item) => item.caption)).toEqual([
      "Krave",
      "Hlev",
    ]);

    expect(await removeGalleryPhoto(items[1].id)).toBeNull();
    expect((await listGallery()).map((item) => item.caption)).toEqual(["Hlev"]);
    expect(await findImageForMedia(items[1].imageId)).toBeNull();
  });

  it("needs a photo", async () => {
    expect(await addGalleryPhoto("Brez slike", 0, noImage)).toBe(
      ErrorCode.imageInvalid,
    );
    expect(await saveGalleryPhoto(999, "Ni je", 0)).toBe(ErrorCode.notFound);
  });
});
