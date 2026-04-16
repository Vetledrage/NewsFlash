'use client'

/* eslint-disable @next/next/no-img-element */

type Props = {
  name: string
  email?: string
  avatarUrl?: string | null
}

export function ChatHeader({ name, email, avatarUrl }: Props) {
  const initial = name[0]?.toUpperCase() ?? '?'

  return (
    <div className="flex items-center gap-3 border-b border-white/10 bg-neutral-950/80 px-5 py-3 backdrop-blur">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="h-9 w-9 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/80 text-sm font-bold text-white">
          {initial}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        {email && name !== email && (
          <p className="truncate text-xs text-gray-500">{email}</p>
        )}
      </div>
    </div>
  )
}


