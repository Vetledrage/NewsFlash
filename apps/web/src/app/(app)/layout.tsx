import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeftSidebar } from '@/components/app-shell/LeftSidebar'
import { Topbar } from '@/components/app-shell/Topbar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-neutral-950 text-white">
      {/* Left sidebar – DMs */}
      <LeftSidebar user={user} />

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="min-h-0 flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

