import { fetchArticleById } from "@/lib/api/articles";

export default async function ArticleDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await fetchArticleById(id);

  return (
    <main className="min-h-dvh bg-bg px-5 py-8 text-white">
      <div className="mx-auto max-w-xl">
        <p className="text-xs text-white/60">{article.source}</p>
        <h1 className="mt-2 text-2xl font-bold">{article.title}</h1>
        <p className="mt-6 text-sm text-white/80">
          This screen is a placeholder for a future “deep dive” mode.
        </p>
        <a
          className="mt-6 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/15"
          href={article.url}
          target="_blank"
          rel="noreferrer"
        >
          Open source
        </a>
      </div>
    </main>
  );
}

