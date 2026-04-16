-- ============================================================================
-- NewsFlash — Complete Supabase Schema
-- ============================================================================
-- Run this ONCE in the Supabase SQL editor.
-- It is safe to re-run: uses IF NOT EXISTS and DROP ... IF EXISTS throughout.
--
-- Tables created:
--   1. public.profiles            — app-level user data
--   2. public.saved_articles      — articles a user bookmarks
--   3. public.direct_conversations — one row per 1:1 DM thread
--   4. public.direct_conversation_members — membership join table
--   5. public.direct_messages     — chat messages (text + article shares)
--
-- Also creates:
--   • auto-profile trigger on auth.users signup
--   • auto-update last_message_at trigger on new message
--   • create_or_get_direct_conversation() RPC function
--   • RLS policies for every table
-- ============================================================================

create extension if not exists pgcrypto;

-- =========================================================
-- HELPER: set_updated_at() — reused by multiple triggers
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 1) PROFILES
-- =========================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text unique,
  username   text unique,
  full_name  text,
  avatar_url text,
  bio        text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- =========================================================
-- 2) SAVED ARTICLES
-- =========================================================
create table if not exists public.saved_articles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  article_url         text not null,
  article_title       text not null,
  article_summary     text,
  article_image_url   text,
  source_name         text,
  author_name         text,
  published_at        timestamptz,
  category            text,
  external_article_id text,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),

  constraint saved_articles_user_id_article_url_key unique (user_id, article_url)
);

create index if not exists saved_articles_user_id_idx
  on public.saved_articles(user_id);
create index if not exists saved_articles_created_at_idx
  on public.saved_articles(created_at desc);

-- =========================================================
-- 3) DIRECT CONVERSATIONS
-- =========================================================
create table if not exists public.direct_conversations (
  id                   uuid primary key default gen_random_uuid(),
  created_by           uuid not null references auth.users(id) on delete cascade,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  last_message_at      timestamptz not null default now(),
  last_message_preview text
);

DROP TRIGGER IF EXISTS set_direct_conversations_updated_at ON public.direct_conversations;
create trigger set_direct_conversations_updated_at
  before update on public.direct_conversations
  for each row execute function public.set_updated_at();

create index if not exists direct_conversations_last_message_at_idx
  on public.direct_conversations(last_message_at desc);

-- =========================================================
-- 4) DIRECT CONVERSATION MEMBERS
-- =========================================================
create table if not exists public.direct_conversation_members (
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  last_read_at    timestamptz,
  primary key (conversation_id, user_id)
);

create index if not exists direct_conversation_members_user_id_idx
  on public.direct_conversation_members(user_id);

-- =========================================================
-- 5) DIRECT MESSAGES
-- =========================================================
-- Stores both plain text messages and article shares.
-- Messages are persisted permanently. Soft-delete via deleted_at.
create table if not exists public.direct_messages (
  id                  uuid primary key default gen_random_uuid(),
  conversation_id     uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id           uuid not null references auth.users(id) on delete cascade,
  message_type        text not null default 'text'
                        check (message_type in ('text', 'article_share')),
  body                text,

  -- Article share fields (populated when message_type = 'article_share')
  article_url         text,
  article_title       text,
  article_summary     text,
  article_image_url   text,
  source_name         text,
  author_name         text,
  published_at        timestamptz,
  external_article_id text,
  article_metadata    jsonb not null default '{}'::jsonb,

  created_at          timestamptz not null default now(),
  edited_at           timestamptz,
  deleted_at          timestamptz,

  -- Every message must have either body text or a shared article
  constraint direct_messages_body_or_article_check check (
    body is not null or article_url is not null
  )
);

create index if not exists direct_messages_conversation_id_created_at_idx
  on public.direct_messages(conversation_id, created_at asc);
create index if not exists direct_messages_sender_id_idx
  on public.direct_messages(sender_id);

-- =========================================================
-- TRIGGER: auto-create profile on signup
-- =========================================================
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
  for each row execute function public.handle_new_user();

-- =========================================================
-- TRIGGER: update conversation on new message
-- =========================================================
-- Keeps last_message_at and last_message_preview fresh so the
-- sidebar conversation list sorts correctly by recent activity.
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
  for each row execute function public.handle_new_direct_message();

-- =========================================================
-- RPC: create or reuse a 1:1 DM conversation
-- =========================================================
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

  -- Check for existing 1:1 conversation between the two users
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

  -- Create new conversation + memberships
  insert into public.direct_conversations (created_by, created_at, updated_at, last_message_at)
  values (current_user_id, now(), now(), now())
  returning id into new_conversation_id;

  insert into public.direct_conversation_members (conversation_id, user_id)
  values
    (new_conversation_id, current_user_id),
    (new_conversation_id, other_user_id);

  return new_conversation_id;
end;
$$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

-- Enable RLS on all tables
alter table public.profiles                    enable row level security;
alter table public.saved_articles              enable row level security;
alter table public.direct_conversations        enable row level security;
alter table public.direct_conversation_members enable row level security;
alter table public.direct_messages             enable row level security;

-- ---------------------------------------------------------
-- Profiles policies
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile"              ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles"   ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"            ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"            ON public.profiles;

create policy "Authenticated users can view profiles"
  on public.profiles for select
  using (auth.uid() is not null);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ---------------------------------------------------------
-- Saved articles policies
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own saved articles"   ON public.saved_articles;
DROP POLICY IF EXISTS "Users can insert own saved articles"  ON public.saved_articles;
DROP POLICY IF EXISTS "Users can update own saved articles"  ON public.saved_articles;
DROP POLICY IF EXISTS "Users can delete own saved articles"  ON public.saved_articles;

create policy "Users can view own saved articles"
  on public.saved_articles for select
  using (auth.uid() = user_id);

create policy "Users can insert own saved articles"
  on public.saved_articles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own saved articles"
  on public.saved_articles for update
  using (auth.uid() = user_id);

create policy "Users can delete own saved articles"
  on public.saved_articles for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- Conversation policies
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can view conversations they belong to" ON public.direct_conversations;

create policy "Users can view conversations they belong to"
  on public.direct_conversations for select
  using (
    exists (
      select 1 from public.direct_conversation_members m
      where m.conversation_id = direct_conversations.id
        and m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------
-- Conversation members policies
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.direct_conversation_members;

create policy "Users can view their own memberships"
  on public.direct_conversation_members for select
  using (user_id = auth.uid());

-- ---------------------------------------------------------
-- Message policies
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can view messages from their conversations"   ON public.direct_messages;
DROP POLICY IF EXISTS "Users can insert messages into their conversations" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can update their own messages"                ON public.direct_messages;
DROP POLICY IF EXISTS "Users can delete their own messages"                ON public.direct_messages;

create policy "Users can view messages from their conversations"
  on public.direct_messages for select
  using (
    exists (
      select 1 from public.direct_conversation_members m
      where m.conversation_id = direct_messages.conversation_id
        and m.user_id = auth.uid()
    )
  );

create policy "Users can insert messages into their conversations"
  on public.direct_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.direct_conversation_members m
      where m.conversation_id = direct_messages.conversation_id
        and m.user_id = auth.uid()
    )
  );

create policy "Users can update their own messages"
  on public.direct_messages for update
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

create policy "Users can delete their own messages"
  on public.direct_messages for delete
  using (sender_id = auth.uid());
