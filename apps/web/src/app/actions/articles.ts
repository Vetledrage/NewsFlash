'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveArticle(input: {
  articleUrl: string
  articleTitle: string
  articleSummary?: string
  articleImageUrl?: string
  sourceName?: string
  authorName?: string
  publishedAt?: string
  category?: string
  externalArticleId?: string
  metadata?: Record<string, unknown>
}) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to save an article.' }
  }

  const { error } = await supabase.from('saved_articles').insert({
    user_id: user.id,
    article_url: input.articleUrl,
    article_title: input.articleTitle,
    article_summary: input.articleSummary ?? null,
    article_image_url: input.articleImageUrl ?? null,
    source_name: input.sourceName ?? null,
    author_name: input.authorName ?? null,
    published_at: input.publishedAt ?? null,
    category: input.category ?? null,
    external_article_id: input.externalArticleId ?? null,
    metadata: input.metadata ?? {},
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function unsaveArticle(savedArticleId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('saved_articles')
    .delete()
    .eq('id', savedArticleId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

