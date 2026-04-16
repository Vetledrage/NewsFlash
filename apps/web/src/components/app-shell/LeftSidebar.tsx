'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { ConversationList } from '@/components/dms/ConversationList'
import { NewDmModal } from '@/components/dms/NewDmModal'

export function LeftSidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()
  const [showNewDm, setShowNewDm] = useState(false)

  // Extract active conversation id from path
  const conversationMatch = pathname.match(/^\/messages\/(.+)$/)
  const activeConversationId = conversationMatch?.[1]

  return (
    <aside className="flex w-72 flex-col border-r border-white/10 bg-neutral-900">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
        <span className="text-xl font-bold tracking-tight">⚡ NewsFlash</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        <Link
          href="/"
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            pathname === '/'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          📰 Feed
        </Link>
        <Link
          href="/saved-articles"
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            pathname === '/saved-articles'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          💾 Saved Articles
        </Link>
      </nav>

      {/* DMs section */}
      <div className="flex-1 overflow-y-auto border-t border-white/10 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Direct Messages
          </h2>
          <button
            onClick={() => setShowNewDm(true)}
            className="rounded p-1 text-gray-500 hover:bg-white/5 hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
        <ConversationList
          activeConversationId={activeConversationId}
          onSelect={(id) => router.push(`/messages/${id}`)}
        />
      </div>

      {/* User info at bottom */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
            {user.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.email}</p>
          </div>
        </div>
      </div>

      <NewDmModal
        open={showNewDm}
        onClose={() => setShowNewDm(false)}
        onCreated={(id) => router.push(`/messages/${id}`)}
      />
    </aside>
  )
}
