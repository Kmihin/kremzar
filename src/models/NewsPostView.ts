// A published news post as shown on the news pages.
export interface NewsPostView {
  slug: string;
  title: string;
  imageId: number | null;
  publishedAt: string;
  dateLabel: string;
  paragraphs: string[];
}
