export type Article = {
  articleId: string;
  url: string;
  title: string;
  scrapedAt: string; // ISO string
  source: string;
  externalId: string;
  // Phase 1 placeholders (backend may add later)
  summary?: string;
  imageUrl?: string;
};

export type SpringPage<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
};

