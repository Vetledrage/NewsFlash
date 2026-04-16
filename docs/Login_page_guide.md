# Supabase Auth + Saved Articles Implementation Spec for AI Agent

This file is the implementation brief for adding **signup, login, logout, user records, and saved articles** using **Supabase**.

The goal is:
- users can create accounts
- users can log in and log out
- each authenticated user can save articles
- **only saved articles** are stored in the database
- users can only view and modify **their own** saved articles

---

## 1. Architecture decision

Use **Supabase Auth** for authentication instead of building your own password table.

### Important
Do **not** create a custom table that stores passwords.
Supabase already stores auth users securely in `auth.users`.

So the final design is:
- `auth.users` → managed by Supabase Auth, used for signup/login/password reset/session
- `public.profiles` → app-level user profile table
- `public.saved_articles` → only articles saved by a specific user

This gives you the **2 app tables** you asked for:
1. `profiles`
2. `saved_articles`

---

## 2. Recommended stack assumptions

Assume the app uses:
- Next.js App Router
- TypeScript
- `@supabase/supabase-js`
- `@supabase/ssr`
- Supabase Postgres with Row Level Security (RLS)

If the project is not Next.js, the database SQL and core auth logic still apply.

---

## 3. Packages to install

```bash
npm install @supabase/supabase-js @supabase/ssr
```

`@supabase/auth-helpers-*` is deprecated in favor of `@supabase/ssr`.

---

## 4. Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_or_publishable_key
```

Use the project values from the Supabase dashboard.

---

## 5. Database schema

Run this in the **Supabase SQL editor**.

```sql
-- Optional but recommended for UUID helpers in some projects
create extension if not exists pgcrypto;

-- =========================================================
-- 1) PROFILES TABLE
-- =========================================================
-- Stores app-level user info.
-- auth.users is the real auth table.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
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
-- 2) SAVED ARTICLES TABLE
-- =========================================================
-- Only articles a user saves are stored here.
-- We are NOT storing every article in the system.

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

  -- Prevent duplicate saves of the same article for one user
  constraint saved_articles_user_id_article_url_key unique (user_id, article_url)
);

create index if not exists saved_articles_user_id_idx
  on public.saved_articles(user_id);

create index if not exists saved_articles_created_at_idx
  on public.saved_articles(created_at desc);
```

---

## 6. Automatically create a profile when a user signs up

Use a trigger so every new auth user gets a matching row in `public.profiles`.

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

## 7. Row Level Security (required)

Enable RLS so users can only access their own rows.

```sql
alter table public.profiles enable row level security;
alter table public.saved_articles enable row level security;
```

### Profiles policies

```sql
-- Users can read their own profile
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id);

-- Users can insert their own profile if needed
create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);
```

### Saved articles policies

```sql
-- Users can read their own saved articles
create policy "Users can view own saved articles"
on public.saved_articles
for select
using (auth.uid() = user_id);

-- Users can insert their own saved articles
create policy "Users can insert own saved articles"
on public.saved_articles
for insert
with check (auth.uid() = user_id);

-- Users can update their own saved articles
create policy "Users can update own saved articles"
on public.saved_articles
for update
using (auth.uid() = user_id);

-- Users can delete their own saved articles
create policy "Users can delete own saved articles"
on public.saved_articles
for delete
using (auth.uid() = user_id);
```

---

## 8. Supabase client setup for Next.js

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

## 9. Auth actions

### Sign up

Use Supabase Auth sign-up with email/password.
Also pass `full_name` in metadata so the profile trigger can use it.

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

  if (error) {
    return { error: error.message }
  }

  redirect('/login?message=Check your email to confirm your account')
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

  if (error) {
    return { error: error.message }
  }

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

## 10. Login page UI

Create a page with:
- email input
- password input
- login button
- signup link or signup form
- error/success message area

### Example `app/login/page.tsx`

```tsx
import { signIn } from '@/app/(auth)/actions'

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-2xl border p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold">Login</h1>
        <p className="mb-6 text-sm text-gray-600">
          Sign in to save and manage your articles.
        </p>

        <form action={signIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-black px-4 py-2 text-white"
          >
            Login
          </button>
        </form>
      </div>
    </main>
  )
}
```

---

## 11. Signup page UI

### Example `app/signup/page.tsx`

```tsx
import { signUp } from '@/app/(auth)/actions'

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-2xl border p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold">Create account</h1>
        <p className="mb-6 text-sm text-gray-600">
          Create an account to save articles.
        </p>

        <form action={signUp} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-black px-4 py-2 text-white"
          >
            Create account
          </button>
        </form>
      </div>
    </main>
  )
}
```

---

## 12. Route protection

Protect pages that require authentication.

### Example protected page

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function SavedArticlesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: articles, error } = await supabase
    .from('saved_articles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <div>Failed to load articles.</div>
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Saved Articles</h1>

      <div className="space-y-4">
        {articles?.map((article) => (
          <article key={article.id} className="rounded-xl border p-4">
            <h2 className="text-lg font-medium">{article.article_title}</h2>
            <a
              href={article.article_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm underline"
            >
              Open article
            </a>
          </article>
        ))}
      </div>
    </main>
  )
}
```

Because RLS is enabled, users only receive their own rows.

---

## 13. Save article logic

When the user clicks **Save article**, insert exactly one row into `saved_articles`.

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
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to save an article.' }
  }

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

  if (error) {
    // Handles duplicate save too because of unique(user_id, article_url)
    return { error: error.message }
  }

  return { success: true }
}
```

---

## 14. Remove saved article logic

```ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function unsaveArticle(savedArticleId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('saved_articles')
    .delete()
    .eq('id', savedArticleId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
```

RLS ensures users can only delete their own saved articles.

---

## 15. Client-side save button example

```tsx
'use client'

import { useTransition } from 'react'
import { saveArticle } from '@/app/actions/articles'

export function SaveArticleButton({
  article,
}: {
  article: {
    url: string
    title: string
    summary?: string
    imageUrl?: string
    source?: string
    author?: string
    publishedAt?: string
    category?: string
    externalId?: string
  }
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await saveArticle({
            articleUrl: article.url,
            articleTitle: article.title,
            articleSummary: article.summary,
            articleImageUrl: article.imageUrl,
            sourceName: article.source,
            authorName: article.author,
            publishedAt: article.publishedAt,
            category: article.category,
            externalArticleId: article.externalId,
          })
        })
      }}
      className="rounded-lg border px-3 py-2"
    >
      {isPending ? 'Saving...' : 'Save article'}
    </button>
  )
}
```

---

## 16. Recommended folder structure

```txt
app/
  actions/
    articles.ts
  (auth)/
    actions.ts
  login/
    page.tsx
  signup/
    page.tsx
  saved-articles/
    page.tsx
lib/
  supabase/
    client.ts
    server.ts
```

---

## 17. What should be stored in `saved_articles`

Store enough data so the user can still view what they saved even if the original source changes later.

Recommended fields to save per saved article:
- article URL
- article title
- summary
- image URL
- source name
- author
- published date
- optional category
- optional external article id
- optional metadata JSON
- timestamp for when the user saved it

Do **not** create a master table containing every article in existence unless the product later requires that.

For the current requirement, storing **only saved articles** is the correct design.

---

## 18. Auth flow summary

1. User opens signup page.
2. User submits email + password.
3. Supabase Auth creates a row in `auth.users`.
4. Database trigger automatically creates a row in `public.profiles`.
5. User signs in from login page.
6. Session is stored by Supabase.
7. When user clicks “Save article”, insert into `public.saved_articles` with `user_id = auth.uid()`.
8. RLS ensures each user only sees their own profile and saved articles.

---

## 19. Common mistakes to avoid

### Do not do this
- Do not store passwords in your own `users` table
- Do not disable RLS on user data tables
- Do not trust `user_id` from the client without checking auth
- Do not create a giant `articles` table for all articles if the product only needs saved ones

### Do this instead
- Use Supabase Auth for signup/login
- Use `profiles` for app-specific user data
- Use `saved_articles` for user-saved content only
- Use unique `(user_id, article_url)` to avoid duplicate saves
- Use server actions or server-side functions for mutations when possible

---

## 20. Optional future improvements

These are not required for the first version but are good next steps:
- password reset page
- email confirmation handling
- social login (Google/GitHub)
- folders or collections for saved articles
- article tags
- notes/highlights on saved articles
- optimistic UI for save/unsave
- pagination for saved articles
- full-text search over saved articles

---

## 21. Final implementation requirement for the AI agent

Implement the following:

1. Set up Supabase client config using environment variables.
2. Create `profiles` and `saved_articles` tables using the SQL in this file.
3. Create the `handle_new_user` trigger so each auth user gets a profile row.
4. Enable RLS and apply all policies exactly as defined.
5. Create signup page.
6. Create login page.
7. Create logout action.
8. Create protected saved-articles page.
9. Create `saveArticle` and `unsaveArticle` actions.
10. Use Supabase Auth for account creation and login.
11. Store only articles that a user explicitly saves.
12. Do not create a custom password table.

---

## 22. Minimal acceptance criteria

The implementation is complete when:
- a new user can sign up
- a user can log in
- a user session persists correctly
- a profile row is created automatically after signup
- a logged-in user can save an article
- the same user can view their saved articles
- one user cannot see another user’s saved articles
- a user can remove a saved article

---

## 23. References used for this design

This spec aligns with current Supabase guidance around:
- Supabase Auth for authentication
- Row Level Security for browser-exposed tables
- Next.js integration using `@supabase/ssr`
- user-management patterns with a profile table linked to `auth.users`

