# NewsFlash – Agent Guide (Read First)

## Goal
Build a backend that:
1) Scrapes news sites (starting with VG),
2) Stores articles in a database,
3) Deduplicates/links similar articles,
4) Produces short “TikTok-style” summaries for a younger audience,
5) Exposes an API for a mobile frontend (scroll feed).

## Current status
- Repo is a monorepo.
- Backend app lives in `apps/api` (Kotlin + Spring Boot).
- App can scrape VG frontpage and save ~60 articles into an in-memory H2 database.
- Flyway migrations exist for `articles`.
- Scheduler is enabled for all profiles except `test`.
- Scraping is gated by a feature toggle:
  - `scraper.enabled=true` (default) enables scheduled scraping
  - `scraper.enabled=false` disables the scheduled crawl job bean
- Initial REST API layer exists:
  - `GET /api/articles` returns the latest articles (up to 50)

## Non-goals (for now)
- No frontend implementation yet.
- No advanced distributed infrastructure.
- No “perfect scraping” across all sites (we will add sources gradually).

## Tech constraints
- Kotlin + Spring Boot
- Flyway for DB migrations
- Tests must be written along the way (not at the end)

## Development principles
- Small steps, always runnable.
- Add one source at a time.
- Prefer readability over cleverness.
- Avoid over-engineering: start simple, refactor when needed.

## Architecture direction (target)
Use a layered structure:
- `domain` – core models + pure logic
- `application` – use cases/services
- `infrastructure` – scraping clients, persistence, AI clients
- `api` – REST controllers + DTOs

## Key rules
- Do NOT parse HTML in controllers.
- Scrapers should be source-specific (VG scraper, etc.).
- Database schema changes must go through Flyway migrations.
- Add tests for:
    - parsing/extraction (unit tests)
    - persistence (repository tests)
    - one end-to-end path (integration test)

## Data definitions
- `Source`: the site (e.g. "VG")
- `externalId`: ID from that source (e.g. VG’s `/i/<id>`)
- `articleId`: internal ID (often `${source}:${externalId}`)
- `rawBody`: extracted full text
- `summary`: short version for feed
- `scrapedAt`: when we scraped it
- `publishedAt`: optional later (if we can extract it reliably)

## Dedup strategy (initial)
- Stage 1: exact dedup by `(source, externalId)` unique constraint
- Stage 2: near-duplicate by similarity (embeddings)
- Stage 3: cluster stories and pick “best canonical summary”

## AI usage (later stages)
- Summarize each article into:
    - 1-sentence headline
    - 3–5 bullet highlights
    - short paragraph (TikTok feed)
- Similarity using embeddings; store vectors + nearest neighbor search.
- Rewriting must preserve meaning and avoid misinformation.

## Safety / Legal
- Respect robots.txt and site Terms where possible.
- Use a clear User-Agent with contact info.
- Avoid scraping paywalled content.
