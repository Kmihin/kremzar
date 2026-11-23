// A NewsPost row read by a query that only returns published posts,
// so publishedAt is always set.
export interface PublishedNewsPost {
  id: number;
  slug: string;
  title: string;
  body: string;
  imageId: number | null;
  publishedAt: string;
}
