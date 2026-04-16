'use client'

/* eslint-disable @next/next/no-img-element */

type Props = {
  articleUrl: string | null
  articleTitle: string | null
  articleSummary: string | null
  articleImageUrl?: string | null
  sourceName?: string | null
}

export function ArticleMessageCard({
  articleUrl,
  articleTitle,
  articleSummary,
  articleImageUrl,
  sourceName,
}: Props) {
  return (
    <a
      href={articleUrl ?? '#'}
      target="_blank"
      rel="noreferrer"
      className="block max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 transition-colors hover:bg-neutral-800"
    >
      <div className="flex gap-3 p-3">
        {articleImageUrl ? (
          <img
            src={articleImageUrl}
            alt={articleTitle || 'Article'}
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/5 text-2xl">
            📰
          </div>
        )}

        <div className="min-w-0 flex-1">
          {sourceName && (
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-gray-500">
              {sourceName}
            </p>
          )}
          <h3 className="line-clamp-2 text-sm font-semibold text-white">
            {articleTitle}
          </h3>
          {articleSummary && (
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">
              {articleSummary}
            </p>
          )}
        </div>
      </div>
    </a>
  )
}



