import { ErrorCode } from "../consts/errorCodes";
import {
  deleteNewsPost,
  findNewsPostById,
  insertNewsPost,
  isNewsSlugTaken,
  listAllNewsPosts,
  updateNewsPost,
} from "../db/newsRepository";
import type { ImageFormInput } from "../models/ImageFormInput";
import type { NewsFormValues } from "../models/NewsFormValues";
import type { NewsInput } from "../models/NewsInput";
import type { NewsPost } from "../models/NewsPost";
import { formatDate, slugify } from "./formatService";
import {
  applyImageForm,
  deleteImageById,
  deleteReplacedImage,
} from "./imageService";

export async function listNewsForAdmin(): Promise<NewsPost[]> {
  return listAllNewsPosts();
}

export async function findNewsForAdmin(id: number): Promise<NewsPost | null> {
  return findNewsPostById(id);
}

export function newsStatusLabel(post: NewsPost): string {
  if (post.publishedAt === null) {
    return "Osnutek";
  }
  return `Objavljeno ${formatDate(post.publishedAt)}`;
}

// Returns an error code, or null when the post was saved. A published post
// gets today's date.
export async function createNews(
  values: NewsFormValues,
  imageForm: ImageFormInput,
): Promise<string | null> {
  const input = toNewsInput(values);
  if (await isNewsSlugTaken(input.slug, 0)) {
    return ErrorCode.newsSlugTaken;
  }
  const image = await applyImageForm(null, imageForm);
  if (!image.isValid) {
    return ErrorCode.imageInvalid;
  }
  const publishedAt = values.isPublished ? new Date().toISOString() : null;
  await insertNewsPost(input, image.imageId, publishedAt);
  return null;
}

// Returns an error code, or null when the post was saved. A post that stays
// published keeps its date; unpublishing makes it a draft again.
export async function saveNews(
  id: number,
  values: NewsFormValues,
  imageForm: ImageFormInput,
): Promise<string | null> {
  const post = await findNewsPostById(id);
  if (post === null) {
    return ErrorCode.notFound;
  }
  const input = toNewsInput(values);
  if (await isNewsSlugTaken(input.slug, id)) {
    return ErrorCode.newsSlugTaken;
  }
  const image = await applyImageForm(post.imageId, imageForm);
  if (!image.isValid) {
    return ErrorCode.imageInvalid;
  }
  let publishedAt: string | null = null;
  if (values.isPublished) {
    publishedAt = post.publishedAt ?? new Date().toISOString();
  }
  await updateNewsPost(id, input, image.imageId, publishedAt);
  await deleteReplacedImage(post.imageId, image.imageId);
  return null;
}

// Deletes the post and its photo.
export async function deleteNews(id: number): Promise<string | null> {
  const post = await findNewsPostById(id);
  if (post === null) {
    return ErrorCode.notFound;
  }
  await deleteNewsPost(id);
  if (post.imageId !== null) {
    await deleteImageById(post.imageId);
  }
  return null;
}

export function emptyNewsFormValues(): NewsFormValues {
  return { title: "", slug: "", body: "", isPublished: true };
}

export function newsFormValuesFromPost(post: NewsPost): NewsFormValues {
  return {
    title: post.title,
    slug: post.slug,
    body: post.body,
    isPublished: post.publishedAt !== null,
  };
}

// The values as posted, to show the form again with its errors.
export function newsFormValuesFromForm(formData: FormData): NewsFormValues {
  return {
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    body: String(formData.get("body") ?? ""),
    isPublished: formData.has("isPublished"),
  };
}

function toNewsInput(values: NewsFormValues): NewsInput {
  return {
    slug: values.slug === "" ? slugify(values.title) : values.slug,
    title: values.title,
    body: values.body,
  };
}
