import { createClient } from '@/lib/supabase/server'
import { MessageThread } from '@/components/dms/MessageThread'

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get the other member's profile for the chat header
  const { data: members } = await supabase
    .from('direct_conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .neq('user_id', user.id)

  let recipient: { name: string; email?: string; avatarUrl?: string | null } | undefined

  const otherUserId = members?.[0]?.user_id
  if (otherUserId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, avatar_url')
      .eq('id', otherUserId)
      .single()

    if (profile) {
      recipient = {
        name: profile.full_name || profile.email || 'Unknown',
        email: profile.email ?? undefined,
        avatarUrl: profile.avatar_url,
      }
    }
  }

  return (
    <MessageThread
      conversationId={conversationId}
      currentUserId={user.id}
      recipient={recipient}
    />
  )
}
