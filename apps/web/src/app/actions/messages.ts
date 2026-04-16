'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createOrOpenDm(otherUserId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('create_or_get_direct_conversation', {
    other_user_id: otherUserId,
  })

  if (error) return { error: error.message }
  return { conversationId: data }
}

export async function sendDirectMessage(input: {
  conversationId: string
  body: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('direct_messages').insert({
    conversation_id: input.conversationId,
    sender_id: user.id,
    message_type: 'text',
    body: input.body,
  })

  if (error) return { error: error.message }

  revalidatePath(`/messages/${input.conversationId}`)
  revalidatePath('/')

  return { success: true }
}

export async function shareArticleInDm(input: {
  conversationId: string
  body?: string
  articleUrl: string
  articleTitle: string
  articleSummary?: string
  articleImageUrl?: string
  sourceName?: string
  authorName?: string
  publishedAt?: string
  externalArticleId?: string
  articleMetadata?: Record<string, unknown>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('direct_messages').insert({
    conversation_id: input.conversationId,
    sender_id: user.id,
    message_type: 'article_share',
    body: input.body ?? null,
    article_url: input.articleUrl,
    article_title: input.articleTitle,
    article_summary: input.articleSummary ?? null,
    article_image_url: input.articleImageUrl ?? null,
    source_name: input.sourceName ?? null,
    author_name: input.authorName ?? null,
    published_at: input.publishedAt ?? null,
    external_article_id: input.externalArticleId ?? null,
    article_metadata: input.articleMetadata ?? {},
  })

  if (error) return { error: error.message }

  revalidatePath(`/messages/${input.conversationId}`)
  revalidatePath('/')

  return { success: true }
}

export async function searchUsers(query: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  let request = supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url')
    .neq('id', user.id)
    .limit(20)

  if (query.trim().length > 0) {
    request = request.or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
  }

  const { data, error } = await request

  if (error) return { error: error.message }
  return { users: data }
}

export async function getConversations() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // Get conversations the user belongs to
  const { data: memberships, error: memErr } = await supabase
    .from('direct_conversation_members')
    .select('conversation_id')
    .eq('user_id', user.id)

  if (memErr) return { error: memErr.message }
  if (!memberships?.length) return { conversations: [] }

  const conversationIds = memberships.map((m) => m.conversation_id)

  const { data: conversations, error: convErr } = await supabase
    .from('direct_conversations')
    .select('*')
    .in('id', conversationIds)
    .order('last_message_at', { ascending: false })

  if (convErr) return { error: convErr.message }

  // For each conversation, get the other member's profile
  const result = await Promise.all(
    (conversations ?? []).map(async (conv) => {
      const { data: members } = await supabase
        .from('direct_conversation_members')
        .select('user_id')
        .eq('conversation_id', conv.id)
        .neq('user_id', user.id)

      const otherUserId = members?.[0]?.user_id
      let otherUser = null

      if (otherUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .eq('id', otherUserId)
          .single()
        otherUser = profile
      }

      return { ...conv, otherUser }
    })
  )

  return { conversations: result }
}

export async function getMessages(conversationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  return { messages: data }
}

