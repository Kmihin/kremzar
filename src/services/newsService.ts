import {
  findPublishedNewsBySlug,
  listPublishedNews,
} from "../db/newsRepository";
import type { NewsPostView } from "../models/NewsPostView";
import type { PublishedNewsPost } from "../models/PublishedNewsPost";
import { formatDate, splitParagraphs } from "./formatService";

export async function listAllNews(): Promise<NewsPostView[]> {
  const posts = await listPublishedNews();
  return posts.map(toNewsPostView);
}

export async function findNewsPost(slug: string): Promise<NewsPostView | null> {
  const post = await findPublishedNewsBySlug(slug);
  if (post === null) {
    return null;
  }
  return toNewsPostView(post);
}

function toNewsPostView(post: PublishedNewsPost): NewsPostView {
  return {
    slug: post.slug,
    title: post.title,
    imageId: post.imageId,
    publishedAt: post.publishedAt,
    dateLabel: formatDate(post.publishedAt),
    paragraphs: splitParagraphs(post.body),
  };
}
