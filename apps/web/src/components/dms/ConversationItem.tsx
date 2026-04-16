'use client'

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

export function ConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}) {
  const other = conversation.otherUser
  const displayName = other?.full_name || other?.email || 'Unknown'
  const initial = displayName[0]?.toUpperCase() ?? '?'

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        isActive
          ? 'bg-white/10 text-white'
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600/80 text-sm font-bold text-white">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <span className="ml-2 shrink-0 text-[10px] text-gray-600">
            {timeAgo(conversation.last_message_at)}
          </span>
        </div>
        {conversation.last_message_preview && (
          <p className="truncate text-xs text-gray-500">
            {conversation.last_message_preview}
          </p>
        )}
      </div>
    </button>
  )
}

