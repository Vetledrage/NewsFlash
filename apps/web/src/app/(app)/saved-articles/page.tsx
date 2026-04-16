import { createClient } from '@/lib/supabase/server'

export default async function SavedArticlesPage() {
  const supabase = await createClient()

  const { data: articles, error } = await supabase
    .from('saved_articles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-red-400">Failed to load articles.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl overflow-y-auto p-6">
      <h1 className="mb-6 text-2xl font-semibold text-white">Saved Articles</h1>

      {articles?.length === 0 && (
        <p className="text-gray-500">No saved articles yet.</p>
      )}

      <div className="space-y-4">
        {articles?.map((article) => (
          <article
            key={article.id}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <h2 className="text-lg font-medium text-white">
              {article.article_title}
            </h2>
            {article.article_summary && (
              <p className="mt-1 text-sm text-gray-400 line-clamp-2">
                {article.article_summary}
              </p>
            )}
            {article.source_name && (
              <p className="mt-1 text-xs text-gray-500">{article.source_name}</p>
            )}
            <a
              href={article.article_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-blue-400 underline"
            >
              Open article
            </a>
          </article>
        ))}
      </div>
    </div>
  )
}
