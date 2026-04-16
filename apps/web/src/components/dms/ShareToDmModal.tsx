'use client'

import { useEffect, useState } from 'react'
import { getConversations, shareArticleInDm } from '@/app/actions/messages'
import { timeAgo } from '@/lib/utils/time'

type Conversation = {
  id: string
  last_message_at: string
  last_message_preview: string | null
  otherUser: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

type ArticlePayload = {
  url: string
  title: string
  summary?: string
  imageUrl?: string
  source?: string
  externalId?: string
}

export function ShareToDmModal({
  open,
  onClose,
  article,
}: {
  open: boolean
  onClose: () => void
  article: ArticlePayload
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState<string | null>(null)
  const [shared, setShared] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getConversations().then((res) => {
      if (res.conversations) setConversations(res.conversations as Conversation[])
      setLoading(false)
    })
  }, [open])

  const handleShare = async (conversationId: string) => {
    setSharing(conversationId)
    await shareArticleInDm({
      conversationId,
      articleUrl: article.url,
      articleTitle: article.title,
      articleSummary: article.summary,
      articleImageUrl: article.imageUrl,
      sourceName: article.source,
      externalArticleId: article.externalId,
    })
    setShared((prev) => new Set(prev).add(conversationId))
    setSharing(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Share Article</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-sm font-medium text-white">{article.title}</p>
          {article.source && (
            <p className="mt-0.5 text-xs text-gray-500">{article.source}</p>
          )}
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Send to conversation
        </p>

        <div className="max-h-60 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-600">
              No conversations yet. Start a DM first.
            </p>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => {
                const other = conv.otherUser
                const name = other?.full_name || other?.email || 'Unknown'
                const initial = name[0]?.toUpperCase() ?? '?'
                const isSent = shared.has(conv.id)

                return (
                  <button
                    key={conv.id}
                    disabled={sharing === conv.id || isSent}
                    onClick={() => handleShare(conv.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5 disabled:opacity-60"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600/80 text-sm font-bold">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{name}</p>
                      <p className="truncate text-xs text-gray-500">
                        {timeAgo(conv.last_message_at)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs">
                      {isSent ? (
                        <span className="text-green-400">✓ Sent</span>
                      ) : sharing === conv.id ? (
                        <span className="text-gray-500">Sending...</span>
                      ) : (
                        <span className="text-blue-400">Send</span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

