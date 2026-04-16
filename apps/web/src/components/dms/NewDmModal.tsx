'use client'

import { useState, useEffect } from 'react'
import { searchUsers, createOrOpenDm } from '@/app/actions/messages'

type Profile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

export function NewDmModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (conversationId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)

  // Load all users when modal opens, and when query changes
  useEffect(() => {
    if (!open) return
    let active = true
    setSearching(true)
    searchUsers(query).then((res) => {
      if (active && res.users) setResults(res.users as Profile[])
      if (active) setSearching(false)
    })
    return () => { active = false }
  }, [open, query])

  const handleSelect = async (userId: string) => {
    setCreating(true)
    const res = await createOrOpenDm(userId)
    if (res.conversationId) {
      onCreated(res.conversationId)
      onClose()
      setQuery('')
      setResults([])
    }
    setCreating(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">New Message</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white"
          >
            ✕
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          autoFocus
        />

        <div className="mt-3 max-h-60 overflow-y-auto">
          {searching && (
            <p className="py-4 text-center text-xs text-gray-500">Searching...</p>
          )}
          {!searching && results.length === 0 && (
            <p className="py-4 text-center text-xs text-gray-500">No users found</p>
          )}
          {results.map((user) => (
            <button
              key={user.id}
              disabled={creating}
              onClick={() => handleSelect(user.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/80 text-sm font-bold">
                {(user.full_name || user.email)[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0">
                {user.full_name && (
                  <p className="truncate text-sm font-medium text-white">
                    {user.full_name}
                  </p>
                )}
                <p className="truncate text-xs text-gray-400">{user.email}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

