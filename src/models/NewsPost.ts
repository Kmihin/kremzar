// A row of the NewsPost table. publishedAt is null for a draft.
export interface NewsPost {
  id: number;
  slug: string;
  title: string;
  body: string;
  imageId: number | null;
  publishedAt: string | null;
}
