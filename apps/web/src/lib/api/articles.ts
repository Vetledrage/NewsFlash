import { apiFetch } from "@/lib/api/client";
import type { Article, SpringPage } from "@/lib/types";

export type ArticlesQuery = {
  page: number;
  size: number;
  source?: string;
  sort?: string[]; // e.g. ["scrapedAt,desc"]
};

export async function fetchArticlesPage(q: ArticlesQuery): Promise<SpringPage<Article>> {
  const params = new URLSearchParams();
  params.set("page", String(q.page));
  params.set("size", String(q.size));
  if (q.source) params.set("source", q.source);
  if (q.sort) q.sort.forEach((s) => params.append("sort", s));

  // Same-origin Next.js proxy route
  return apiFetch<SpringPage<Article>>(`/api/articles?${params.toString()}`);
}

export async function fetchArticleById(id: string): Promise<Article> {
  return apiFetch<Article>(`/api/articles/${encodeURIComponent(id)}`);
}

