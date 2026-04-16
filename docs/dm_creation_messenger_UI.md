# Next Step Spec: Create DMs + Messenger-Style Chat UI + Compact Article Messages

This file is the **next-step implementation brief**.
It assumes the following already works:

- authentication/login is working
- the app shell exists
- users can be discovered/listed in the UI
- the app already saves articles
- user listing bug is fixed

The current missing pieces are:
1. **creating/opening DMs reliably**
2. **building the DM interface**
3. **showing shared articles inside chat in a compact, clickable format**

The goal is a **Messenger-style** direct messaging experience:
- chat list on the left
- active conversation in the main chat area
- messages styled like a modern chat UI
- article shares rendered as compact cards
- clicking a shared article opens the real article website in a new tab

---

## 1. Goal of this phase

Implement all of the following:

- clicking a user opens an existing DM or creates one if missing
- left sidebar shows recent DMs ordered by recent activity
- main chat panel shows the selected conversation
- users can send text messages
- users can share an article into the active conversation
- article messages render as compact cards inside chat
- article cards link to the real article URL
- message sending updates the conversation ordering
- the UI feels like Messenger rather than Discord

---

## 2. Product/UI direction

Use **Messenger-like** UI patterns:

### Left sidebar
- recent chats list
- search chats/users at the top
- each row shows:
  - avatar
  - user name
  - last message preview
  - time
- active row has highlighted background
- newest recent conversation at the top

### Main chat area
- sticky top chat header with recipient avatar + name
- scrollable message history
- composer fixed to the bottom
- messages grouped visually like modern chat apps
- own messages aligned right
- other user messages aligned left
- shared articles displayed as compact cards inside the thread

### Message style
- text message bubble
- article-share message bubble/card
- timestamp in small muted text
- clean rounded UI
- compact but readable spacing

### Important design note
This should feel **closer to Messenger/iMessage** than to Discord.
That means:
- fewer dense panels
- more rounded message bubbles
- cleaner thread focus
- more spacious chat area
- compact but recognizable article previews

---

## 3. Data model for this phase

Use these existing or planned tables:
- `public.direct_conversations`
- `public.direct_conversation_members`
- `public.direct_messages`

If they do not already exist, create them exactly as in the larger architecture spec.

For this phase, the important behavior is:
- there should be exactly one 1:1 conversation between two users
- when a user clicks another user, the app should reuse the existing conversation or create one
- messages can be plain text or article-share messages

---

## 4. Reliable DM creation/open logic

### Required behavior
When the current user clicks another user from the user list:
1. check if a 1:1 conversation already exists between them
2. if it exists, return it
3. if it does not exist, create it
4. navigate to that conversation

### Best implementation approach
Use a **Supabase RPC / Postgres function** to do this atomically.
Do not try to create the conversation and membership rows from the client in multiple separate calls.

---

## 5. SQL: create-or-open DM function

Run this in the Supabase SQL editor.

```sql
create or replace function public.create_or_get_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_conversation_id uuid;
  new_conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if other_user_id is null or other_user_id = current_user_id then
    raise exception 'Invalid other_user_id';
  end if;

  select c.id
  into existing_conversation_id
  from public.direct_conversations c
  join public.direct_conversation_members m1 on m1.conversation_id = c.id
  join public.direct_conversation_members m2 on m2.conversation_id = c.id
  where m1.user_id = current_user_id
    and m2.user_id = other_user_id
  group by c.id
  having count(*) = 2
  limit 1;

  if existing_conversation_id is not null then
    return existing_conversation_id;
  end if;

  insert into public.direct_conversations (
    created_by,
    created_at,
    updated_at,
    last_message_at
  )
  values (
    current_user_id,
    now(),
    now(),
    now()
  )
  returning id into new_conversation_id;

  insert into public.direct_conversation_members (conversation_id, user_id)
  values
    (new_conversation_id, current_user_id),
    (new_conversation_id, other_user_id);

  return new_conversation_id;
end;
$$;
```

---

## 6. Update conversation ordering when messages are sent

The chat list must reorder itself by latest activity.

Run this SQL if not already added:

```sql
create or replace function public.handle_new_direct_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.direct_conversations
  set
    last_message_at = new.created_at,
    last_message_preview = case
      when new.message_type = 'article_share' and new.article_title is not null
        then coalesce(new.body, 'Shared an article') || ' · ' || new.article_title
      else left(coalesce(new.body, ''), 140)
    end,
    updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS on_direct_message_created ON public.direct_messages;
create trigger on_direct_message_created
after insert on public.direct_messages
for each row
execute function public.handle_new_direct_message();
```

---

## 7. Server actions

### 7.1 Create or open a DM

```ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function createOrOpenDm(otherUserId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('create_or_get_direct_conversation', {
    other_user_id: otherUserId,
  })

  if (error) {
    return { error: error.message }
  }

  return { conversationId: data }
}
```

### 7.2 Send text message

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendDirectMessage(input: {
  conversationId: string
  body: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const trimmed = input.body.trim()
  if (!trimmed) return { error: 'Message cannot be empty' }

  const { error } = await supabase.from('direct_messages').insert({
    conversation_id: input.conversationId,
    sender_id: user.id,
    message_type: 'text',
    body: trimmed,
  })

  if (error) return { error: error.message }

  revalidatePath(`/messages/${input.conversationId}`)
  revalidatePath(`/`)

  return { success: true }
}
```

### 7.3 Share article into DM

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
    body: input.body?.trim() || null,
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
  revalidatePath(`/`)

  return { success: true }
}
```

---

## 8. Routing recommendation

Use a dedicated route for the active conversation.

### Recommended routes
```txt
/messages/[conversationId]
```

### Behavior
- left sidebar stays visible
- the selected conversation loads in the main chat area
- user can still return to the feed using app navigation

### Alternative
If the app shell already centers the feed at `/`, the conversation can open as a nested panel or modal.
But for implementation simplicity, a dedicated route is cleaner.

---

## 9. Recommended component structure

```txt
components/
  dms/
    conversation-list.tsx
    conversation-list-item.tsx
    chat-header.tsx
    message-thread.tsx
    message-bubble.tsx
    article-message-card.tsx
    message-composer.tsx
    new-dm-modal.tsx
    user-picker.tsx
```

---

## 10. Messenger-style layout example

### Main shell layout
- left sidebar: 320px
- main chat area: flex-grow
- neutral/light or dark polished palette
- rounded cards, subtle borders, comfortable spacing

### Example shell

```tsx
<div className="grid min-h-screen grid-cols-[320px_1fr] bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-white">
  <aside className="border-r border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900">
    {/* conversation list */}
  </aside>

  <section className="flex min-w-0 flex-col">
    {/* chat header */}
    {/* thread */}
    {/* composer */}
  </section>
</div>
```

---

## 11. Conversation list UI requirements

### Each conversation row should show
- avatar of other user
- display name
- last message preview
- relative or formatted time
- optional unread badge later

### Style direction
- rounded row
- hover background
- active conversation gets stronger highlight
- compact preview text with ellipsis
- newest active conversation at the top

### Example row feel
- avatar on the left
- name + preview stacked
- timestamp on the right

---

## 12. Chat header UI requirements

At the top of the active thread show:
- recipient avatar
- recipient display name
- optional online/last active later
- optional actions menu later

Style:
- sticky top header
- subtle border bottom
- white or neutral background

---

## 13. Message thread UI requirements

### Thread behavior
- messages displayed oldest → newest
- scrollable history
- own messages aligned right
- other user messages aligned left
- compact vertical spacing
- date separators optional later

### Text bubble style
- own messages: filled accent bubble
- other messages: muted neutral bubble
- rounded corners
- max width around 70%
- small timestamp under or next to bubble

### Example alignment rules
- `sender_id === currentUser.id` → right aligned
- otherwise left aligned

---

## 14. Compact article card inside chat

When a message is an article share, render a compact but clickable card.

### Required content
- article image thumbnail if available
- article title
- source name
- short summary or preview line if available
- optional note/message body above the card
- link opens the real article website in a new tab

### Compactness rules
Because this is inside chat, the article card should be **more space-efficient** than the saved-article card.

Use:
- smaller thumbnail
- shorter summary
- tighter padding
- title limited to 2 lines
- summary limited to 2 lines
- source on one line

### Click behavior
Wrap the article card in an anchor:

```tsx
<a href={message.article_url} target="_blank" rel="noreferrer">
  ...card...
</a>
```

### Article card layout recommendation
- horizontal layout on desktop
- thumbnail left, text right
- rounded border
- hover highlight
- compact spacing

### Example structure

```tsx
export function ArticleMessageCard({ message }: { message: any }) {
  return (
    <a
      href={message.article_url}
      target="_blank"
      rel="noreferrer"
      className="block max-w-md overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:hover:bg-neutral-800"
    >
      <div className="flex gap-3 p-3">
        {message.article_image_url ? (
          <img
            src={message.article_image_url}
            alt={message.article_title || 'Article image'}
            className="h-16 w-16 rounded-xl object-cover"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          {message.source_name ? (
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
              {message.source_name}
            </p>
          ) : null}

          <h3 className="line-clamp-2 text-sm font-semibold">
            {message.article_title}
          </h3>

          {message.article_summary ? (
            <p className="mt-1 line-clamp-2 text-xs text-neutral-600 dark:text-neutral-300">
              {message.article_summary}
            </p>
          ) : null}
        </div>
      </div>
    </a>
  )
}
```

---

## 15. Message bubble component behavior

### If message is text
Render a normal bubble.

### If message is article_share
Render:
- optional note/body as a text bubble or caption
- compact article card beneath it

### Example behavior
```tsx
if (message.message_type === 'article_share') {
  return (
    <div className="space-y-2">
      {message.body ? <TextBubble body={message.body} isOwn={isOwn} /> : null}
      <ArticleMessageCard message={message} />
    </div>
  )
}
```

---

## 16. Composer requirements

The composer at the bottom of the thread should support:
- text input
- send button
- optional selected article attachment state

### UX
- text input stays sticky at bottom
- pressing Enter sends
- Shift+Enter can insert newline if desired
- when an article is selected to share, show a small attachment preview above the composer
- sending clears the input and attachment state

### Example composer features
- plain message send
- article share send
- optionally send note + article together

---

## 17. Feed integration: share button

Each article in the feed should have:
- save button
- share button

### Share flow
1. user clicks `Share`
2. app opens small modal or drawer
3. user picks one of their recent DMs or selects a user
4. app creates/opens DM if needed
5. app sends article share message
6. user is optionally navigated into the conversation or shown success toast

### Recommendation
For V1:
- if there is already an active conversation, allow “Share to current chat”
- otherwise open a small recipient picker modal

---

## 18. Query requirements for sidebar and thread

### Sidebar query must return
- conversations the current user belongs to
- other participant profile info
- latest preview
- latest message time
- ordered by `last_message_at desc`

### Thread query must return
- all messages for selected conversation
- ordered by `created_at asc`

### Security requirement
All reads must depend on RLS so only conversation members can access the DM.

---

## 19. Suggested page/component flow

### When clicking a user in the people list
- call `createOrOpenDm(otherUserId)`
- route to `/messages/[conversationId]`

### On `/messages/[conversationId]`
- load conversation member data
- load thread messages
- render Messenger UI

### On send
- call `sendDirectMessage`
- refresh thread
- sidebar ordering updates from conversation trigger

### On article share
- call `shareArticleInDm`
- refresh thread
- article card appears inline

---

## 20. Suggested files to add or finish

```txt
app/
  messages/
    [conversationId]/
      page.tsx
  actions/
    messages.ts
components/
  dms/
    conversation-list.tsx
    conversation-list-item.tsx
    chat-header.tsx
    message-thread.tsx
    message-bubble.tsx
    article-message-card.tsx
    message-composer.tsx
    new-dm-modal.tsx
```

---

## 21. Minimal acceptance criteria for this phase

This phase is complete when:
- clicking a user creates or opens a DM reliably
- the app routes to the conversation
- the left sidebar shows recent conversations
- the active thread renders properly
- text messages can be sent
- shared article messages can be sent
- article messages show as compact cards in chat
- clicking the article card opens the real article website
- conversation ordering updates after sending a message

---

## 22. Nice-to-have improvements after this phase

Not required right now:
- unread counts
- live typing indicator
- message seen state
- realtime updates with Supabase Realtime
- emoji reactions
- attachments beyond article shares
- soft delete/edit UI

---

## 23. Final instruction to the agent

Implement this phase now.

Priority order:
1. make DM creation work with the RPC
2. connect user click → create/open DM → route to thread
3. build left sidebar conversation list
4. build Messenger-style active chat UI
5. implement message composer
6. implement article-share card UI
7. wire article click-through to the original article website

