'use client'

import { useEffect, useState } from 'react'
import { getConversations } from '@/app/actions/messages'
import { ConversationItem } from '@/components/dms/ConversationItem'

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

export function ConversationList({
  activeConversationId,
  onSelect,
}: {
  activeConversationId?: string
  onSelect: (id: string) => void
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const res = await getConversations()
    if (res.conversations) setConversations(res.conversations as Conversation[])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // Poll every 10s for new conversations
    const interval = setInterval(refresh, 10000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <p className="px-3 py-8 text-center text-xs text-gray-600">
        No conversations yet
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={conv.id === activeConversationId}
          onClick={() => onSelect(conv.id)}
        />
      ))}
    </div>
  )
}

