import { signOut } from '@/app/(auth)/actions'
import type { User } from '@supabase/supabase-js'

export function Topbar({ user }: { user: User }) {
  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-neutral-950/80 px-6 py-3 backdrop-blur">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">{user.email}</span>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  )
}

