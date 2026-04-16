'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getMessages, sendDirectMessage } from '@/app/actions/messages'
import { timeAgo } from '@/lib/utils/time'
import { ChatHeader } from '@/components/dms/ChatHeader'
import { ArticleMessageCard } from '@/components/dms/ArticleMessageCard'

type Message = {
  id: string
  sender_id: string
  message_type: string
  body: string | null
  article_url: string | null
  article_title: string | null
  article_summary: string | null
  article_image_url: string | null
  source_name: string | null
  created_at: string
}

type RecipientInfo = {
  name: string
  email?: string
  avatarUrl?: string | null
}

export function MessageThread({
  conversationId,
  currentUserId,
  recipient,
}: {
  conversationId: string
  currentUserId: string
  recipient?: RecipientInfo
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    const res = await getMessages(conversationId)
    if (res.messages) setMessages(res.messages as Message[])
    setLoading(false)
  }, [conversationId])

  useEffect(() => {
    setLoading(true)
    fetchMessages()
    const interval = setInterval(fetchMessages, 4000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setSending(true)
    setBody('')
    await sendDirectMessage({ conversationId, body: trimmed })
    await fetchMessages()
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      {recipient && (
        <ChatHeader
          name={recipient.name}
          email={recipient.email}
          avatarUrl={recipient.avatarUrl}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-white/5" />
                <div className="h-10 w-48 animate-pulse rounded-2xl bg-white/5" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20 text-2xl">
              💬
            </div>
            <p className="text-sm font-medium text-gray-400">No messages yet</p>
            <p className="text-xs text-gray-600">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, idx) => {
              const isMine = msg.sender_id === currentUserId
              const prev = messages[idx - 1]
              const sameSender = prev?.sender_id === msg.sender_id
              const showGap = !sameSender

              return (
                <div key={msg.id}>
                  {showGap && idx > 0 && <div className="h-3" />}
                  <div
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                      {/* Article share card */}
                      {msg.message_type === 'article_share' && msg.article_title ? (
                        <div className="space-y-1.5">
                          {msg.body && (
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm ${
                                isMine
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white/[0.08] text-gray-100'
                              }`}
                            >
                              {msg.body}
                            </div>
                          )}
                          <ArticleMessageCard
                            articleUrl={msg.article_url}
                            articleTitle={msg.article_title}
                            articleSummary={msg.article_summary}
                            articleImageUrl={msg.article_image_url}
                            sourceName={msg.source_name}
                          />
                        </div>
                      ) : (
                        /* Text bubble */
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isMine
                              ? 'bg-blue-600 text-white'
                              : 'bg-white/[0.08] text-gray-100'
                          }`}
                        >
                          {msg.body}
                        </div>
                      )}

                      {/* Timestamp */}
                      {(!messages[idx + 1] || messages[idx + 1]?.sender_id !== msg.sender_id) && (
                        <p
                          className={`mt-1 px-1 text-[10px] text-gray-600 ${
                            isMine ? 'text-right' : 'text-left'
                          }`}
                        >
                          {timeAgo(msg.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/10 bg-neutral-950/60 px-4 py-3 backdrop-blur">
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            style={{ height: 'auto', overflow: 'hidden' }}
            onInput={(e) => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 128) + 'px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !body.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
