# Supabase Auth-Required News App + Left Sidebar DMs Spec for AI Agent

This file is the implementation brief for evolving the app into an **auth-required news platform** with a **Discord-inspired layout**:

- the app is unusable unless the user is logged in
- if not logged in, the user is redirected to `/login`
- the main app shell has:
    - **left sidebar** = DMs / recent conversations
    - **center panel** = news timeline / article feed
- users can send text messages to other users
- users can share news articles inside DMs
- chat messages are persisted in the database
- saved articles are persisted separately
- recent conversations are ordered newest-first using latest message activity
- the agent should implement this in **phases** to reduce risk

This spec assumes:
- Next.js App Router
- TypeScript
- Supabase Auth
- Supabase Postgres
- Supabase RLS
- optional Supabase Realtime for live chat updates

---

## 1. Product requirements

### Auth requirement
The app must be fully gated behind authentication.

**Rule:** if the user is not authenticated, they cannot use the app and must be redirected to `/login`.

### Shell requirement
After login, the user sees one persistent authenticated app shell:
- **left sidebar:** conversations / DMs
- **center:** article timeline
- optional topbar for profile/logout/search

### Messaging requirement
Users can:
- search for another user
- open or create a DM thread
- send text messages
- share a news article in a DM
- revisit older conversations

### Feed requirement
Users can:
- browse a timeline of news articles
- save articles for themselves
- share articles into a DM

### Persistence requirement
The backend must save:
- user profile data
- saved articles
- direct message conversations
- direct messages
- optional article snapshots attached to messages

---

## 2. Important architecture rule

Use **Supabase Auth** for real authentication.

Do **not** create a custom password table.

Supabase already manages auth users in `auth.users`.

### App-level tables to use
- `auth.users` → managed by Supabase Auth
- `public.profiles` → app-specific user data
- `public.saved_articles` → only articles a user explicitly saves
- `public.direct_conversations` → one row per DM thread
- `public.direct_conversation_members` → membership rows connecting users to a DM
- `public.direct_messages` → chat messages with optional shared article data

---

## 3. UI layout requirement

Create a Discord-inspired layout, but adapted to a news app.

### Main authenticated layout
- **Left sidebar (DMs):**
    - app logo/title
    - new DM button
    - search users input
    - conversation list
    - each conversation row shows:
        - avatar
        - display name
        - last message preview
        - timestamp
        - optional unread badge later
- **Center panel (feed):**
    - timeline of news articles
    - save button on each article
    - share-to-chat button on each article
    - article cards or article list
- **Top header (optional):**
    - current user avatar/name
    - logout button
    - filters/search/categories

### UX behavior
- left sidebar is always visible inside the authenticated shell
- center timeline remains the main browsing surface
- user can switch between conversations without leaving the app shell
- most recent conversation appears at the top of the left sidebar

---

## 4. Recommended phased implementation

Implement in this order.

### Phase 1 — Auth gate the whole app
- set up Supabase SSR auth
- create login/signup pages
- add middleware/proxy guard
- redirect unauthenticated users to `/login`
- create `profiles` and `saved_articles`

### Phase 2 — Build the authenticated app shell
- create the persistent app layout
- left sidebar placeholder
- center feed area
- topbar with logout/profile

### Phase 3 — Add DM database layer
- create `direct_conversations`
- create `direct_conversation_members`
- create `direct_messages`
- enable RLS for all chat tables
- add create/open DM function

### Phase 4 — Add DM UI
- user search
- recent chats in left sidebar
- open thread view
- send text messages

### Phase 5 — Add article sharing inside chat
- share article button from feed
- insert `article_share` message row
- show article preview inside the thread

### Phase 6 — Optional realtime
- subscribe to new messages with Supabase Realtime
- update thread and sidebar live

---

## 5. Packages

```bash
npm install @supabase/supabase-js @supabase/ssr
```

---

## 6. Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

---

## 7. Database schema

Run this SQL in the Supabase SQL editor.

```sql
create extension if not exists pgcrypto;

-- =========================================================
-- PROFILES
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- =========================================================
-- SAVED ARTICLES
-- =========================================================
create table if not exists public.saved_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_url text not null,
  article_title text not null,
  article_summary text,
  article_image_url text,
  source_name text,
  author_name text,
  published_at timestamptz,
  category text,
  external_article_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint saved_articles_user_id_article_url_key unique (user_id, article_url)
);

create index if not exists saved_articles_user_id_idx
  on public.saved_articles(user_id);

create index if not exists saved_articles_created_at_idx
  on public.saved_articles(created_at desc);

-- =========================================================
-- DIRECT CONVERSATIONS
-- One row per 1:1 DM thread.
-- =========================================================
create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_message_preview text
);

DROP TRIGGER IF EXISTS set_direct_conversations_updated_at ON public.direct_conversations;
create trigger set_direct_conversations_updated_at
before update on public.direct_conversations
for each row
execute function public.set_updated_at();

create index if not exists direct_conversations_last_message_at_idx
  on public.direct_conversations(last_message_at desc);

-- =========================================================
-- DIRECT CONVERSATION MEMBERS
-- Membership rows for DMs.
-- =========================================================
create table if not exists public.direct_conversation_members (
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create index if not exists direct_conversation_members_user_id_idx
  on public.direct_conversation_members(user_id);

-- =========================================================
-- DIRECT MESSAGES
-- Can store plain text or a shared article snapshot.
-- =========================================================
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message_type text not null default 'text' check (message_type in ('text', 'article_share')),
  body text,

  article_url text,
  article_title text,
  article_summary text,
  article_image_url text,
  source_name text,
  author_name text,
  published_at timestamptz,
  external_article_id text,
  article_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,

  constraint direct_messages_body_or_article_check check (
    body is not null
    or article_url is not null
  )
);

create index if not exists direct_messages_conversation_id_created_at_idx
  on public.direct_messages(conversation_id, created_at asc);

create index if not exists direct_messages_sender_id_idx
  on public.direct_messages(sender_id);
```

---

## 8. Auto-create profiles for new auth users

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
```

---

## 9. Keep recent DMs sorted by latest activity

Every time a new message is inserted, update the parent conversation.
This drives the left sidebar ordering.

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

## 10. Row Level Security

Enable RLS on all app tables.

```sql
alter table public.profiles enable row level security;
alter table public.saved_articles enable row level security;
alter table public.direct_conversations enable row level security;
alter table public.direct_conversation_members enable row level security;
alter table public.direct_messages enable row level security;
```

### Profiles policies

```sql
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);
```

### Saved articles policies

```sql
create policy "Users can view own saved articles"
on public.saved_articles
for select
using (auth.uid() = user_id);

create policy "Users can insert own saved articles"
on public.saved_articles
for insert
with check (auth.uid() = user_id);

create policy "Users can update own saved articles"
on public.saved_articles
for update
using (auth.uid() = user_id);

create policy "Users can delete own saved articles"
on public.saved_articles
for delete
using (auth.uid() = user_id);
```

### Conversation policies

```sql
create policy "Users can view conversations they belong to"
on public.direct_conversations
for select
using (
  exists (
    select 1
    from public.direct_conversation_members m
    where m.conversation_id = direct_conversations.id
      and m.user_id = auth.uid()
  )
);
```

### Conversation members policies

```sql
create policy "Users can view their own memberships"
on public.direct_conversation_members
for select
using (user_id = auth.uid());
```

### Message policies

```sql
create policy "Users can view messages from their conversations"
on public.direct_messages
for select
using (
  exists (
    select 1
    from public.direct_conversation_members m
    where m.conversation_id = direct_messages.conversation_id
      and m.user_id = auth.uid()
  )
);

create policy "Users can insert messages into their conversations"
on public.direct_messages
for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.direct_conversation_members m
    where m.conversation_id = direct_messages.conversation_id
      and m.user_id = auth.uid()
  )
);

create policy "Users can update their own messages"
on public.direct_messages
for update
using (sender_id = auth.uid())
with check (sender_id = auth.uid());

create policy "Users can delete their own messages"
on public.direct_messages
for delete
using (sender_id = auth.uid());
```

---

## 11. Safe helper function to create or open a DM

Use an RPC function so the client does not manually create the conversation and membership rows in separate steps.

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

  select m1.conversation_id
  into existing_conversation_id
  from public.direct_conversation_members m1
  join public.direct_conversation_members m2
    on m1.conversation_id = m2.conversation_id
  where m1.user_id = current_user_id
    and m2.user_id = other_user_id
  group by m1.conversation_id
  having count(*) = 2
  limit 1;

  if existing_conversation_id is not null then
    return existing_conversation_id;
  end if;

  insert into public.direct_conversations (created_by)
  values (current_user_id)
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

## 12. Supabase client setup

### `lib/supabase/client.ts`

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

### `lib/supabase/server.ts`

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignore if called from a Server Component that cannot set cookies.
          }
        },
      },
    }
  )
}
```

---

## 13. Force login for the whole app

Create route protection with middleware.

### `middleware.ts`

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/auth') ||
    pathname === '/forgot-password'

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

This makes the app effectively inaccessible unless logged in.

---

## 14. Auth actions

### Sign up

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')
  const fullName = String(formData.get('fullName') || '')

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) return { error: error.message }

  redirect('/')
}
```

### Sign in

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) return { error: error.message }

  redirect('/')
}
```

### Sign out

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

---

## 15. Authenticated app shell

Create a protected app shell in `app/(app)/layout.tsx`.

### Required behavior
- check user server-side
- redirect to `/login` if unauthenticated
- render the persistent shell

### Example structure

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
    <div className="grid min-h-screen grid-cols-[320px_1fr] bg-neutral-950 text-white">
      <aside className="border-r border-white/10 bg-neutral-900">
        {/* Left DMs sidebar */}
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="border-b border-white/10 px-6 py-4">
          {/* Topbar */}
        </header>

        <main className="min-h-0 overflow-y-auto px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

---

## 16. Login page

Create a simple login page at `/login`.

Required fields:
- email
- password
- login button
- signup link

---

## 17. Signup page

Create a signup page at `/signup`.

Required fields:
- full name
- email
- password
- create account button

---

## 18. Feed page requirements

The center timeline should:
- render news articles
- allow saving an article
- allow sharing an article into a selected DM

Each article card should support:
- title
- source
- published time
- summary
- image if available
- `Save` button
- `Share` button

---

## 19. Save article action

Saved articles are personal bookmarks.
These stay separate from chat messages.

### Example server action

```ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveArticle(input: {
  articleUrl: string
  articleTitle: string
  articleSummary?: string
  articleImageUrl?: string
  sourceName?: string
  authorName?: string
  publishedAt?: string
  category?: string
  externalArticleId?: string
  metadata?: Record<string, unknown>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('saved_articles').insert({
    user_id: user.id,
    article_url: input.articleUrl,
    article_title: input.articleTitle,
    article_summary: input.articleSummary ?? null,
    article_image_url: input.articleImageUrl ?? null,
    source_name: input.sourceName ?? null,
    author_name: input.authorName ?? null,
    published_at: input.publishedAt ?? null,
    category: input.category ?? null,
    external_article_id: input.externalArticleId ?? null,
    metadata: input.metadata ?? {},
  })

  if (error) return { error: error.message }

  return { success: true }
}
```

---

## 20. Creating or opening a DM

Flow:
1. user clicks `New DM`
2. app shows a searchable user picker
3. user selects another user
4. call the RPC `create_or_get_direct_conversation`
5. open the returned conversation in the DM thread view

### Example action

```ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function createOrOpenDm(otherUserId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('create_or_get_direct_conversation', {
    other_user_id: otherUserId,
  })

  if (error) return { error: error.message }

  return { conversationId: data }
}
```

---

## 21. Send text message

### Example action

```ts
'use server'

import { createClient } from '@/lib/supabase/server'

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

  return { success: true }
}
```

---

## 22. Share article into chat

A shared article should be stored as a `direct_messages` row with `message_type = 'article_share'`.
That allows the message to remain readable later even if the feed changes.

### Example action

```ts
'use server'

import { createClient } from '@/lib/supabase/server'

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

  return { success: true }
}
```

---

## 23. Left sidebar conversation list

The left sidebar should show the current user’s DMs ordered by recent activity.

### Required data per row
- conversation id
- other participant id
- other participant name
- other participant avatar
- last message preview
- last message timestamp

### Ordering
Sort by `last_message_at desc`.
Newest active conversation goes at the top.

### Sidebar components
- `ConversationList`
- `ConversationListItem`
- `NewDmButton`
- `UserSearchModal`

---

## 24. Thread view requirements

The thread view should:
- show messages oldest-to-newest within the thread
- include sender identity styling
- show message timestamp
- render article preview cards when `message_type = 'article_share'`
- have a composer input at the bottom

### Composer supports
- text message send
- optional share selected article into current conversation

---

## 25. Suggested folder structure

```txt
app/
  (app)/
    layout.tsx
    page.tsx
    saved/page.tsx
    messages/[conversationId]/page.tsx
    profile/page.tsx
  login/page.tsx
  signup/page.tsx
  actions/
    auth.ts
    articles.ts
    messages.ts
components/
  app-shell/
    left-sidebar.tsx
    topbar.tsx
  dms/
    conversation-list.tsx
    conversation-item.tsx
    message-thread.tsx
    message-composer.tsx
    new-dm-modal.tsx
  feed/
    article-card.tsx
lib/
  supabase/
    client.ts
    server.ts
middleware.ts
```

---

## 26. Optional realtime requirement

For a better DM experience, add live updates.

### Realtime behavior
- subscribe to `direct_messages` inserts for the active conversation
- update the open thread immediately
- refresh or optimistically update the sidebar ordering

### This is optional in V1
V1 can work with manual refresh / revalidation.

---

## 27. Acceptance criteria

The implementation is complete when:
- unauthenticated users are always redirected to `/login`
- logged-in users can access the app shell
- the shell has a left DM sidebar and center feed
- users can sign up, log in, and log out
- a `profiles` row is created automatically on signup
- users can save an article
- users can create or open a DM with another user
- users can send text messages
- users can share articles inside DMs
- messages persist in the database
- only DM members can read a DM
- conversations in the left sidebar are sorted by most recent activity

---

## 28. Common mistakes to avoid

### Do not do this
- do not create your own password table
- do not store all articles globally if only saved articles are needed
- do not disable RLS on user data or chat tables
- do not let clients create raw membership rows without validation
- do not mix saved articles and chat messages into one table

### Do this instead
- use Supabase Auth for accounts and sessions
- use `profiles` for app user info
- use `saved_articles` for bookmarks
- use `direct_messages` for chat persistence
- use a function or RPC to create/open DMs safely
- use `last_message_at` for sidebar ordering

---

## 29. Agent task list

Implement the app in this order:

1. set up Supabase SSR client/server helpers
2. create login and signup pages
3. add middleware so the whole app requires login
4. create `profiles` and `saved_articles`
5. create app shell with left sidebar + center feed
6. create `direct_conversations`, `direct_conversation_members`, and `direct_messages`
7. enable RLS and add all policies
8. add `create_or_get_direct_conversation` RPC
9. add left sidebar conversation list
10. add thread page / thread view
11. add send text message action
12. add share article to DM action
13. connect article cards to save + share actions
14. optionally add realtime subscriptions

---

## 30. Final implementation note

This should be done in parts.

Recommended execution plan:
- **Part 1:** auth gating + login/signup + profiles + saved articles
- **Part 2:** authenticated shell with left sidebar and center feed
- **Part 3:** DM schema + policies + RPC
- **Part 4:** DM UI and message sending
- **Part 5:** share article into chat + polish + realtime

