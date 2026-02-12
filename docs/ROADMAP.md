# Roadmap (Incremental)

## Completed (current state)
- Monorepo structure in place (`apps/api`, `docs`, etc.)
- Flyway migrations for `articles`
- Unique constraint on `(source, external_id)`
- Scraper feature toggle `scraper.enabled`
- Scheduling disabled for tests (CI-stable test runs)
- Initial REST API:
  - `GET /api/articles` (latest 50 as DTOs)

## Milestone 1 – Make scraping robust (no AI yet)
- Refactor VG logic into VG-specific classes (crawler + article scraper)
- Add unit tests using HTML fixtures (no network)
- Add dedup/idempotency before fetching articles (skip fetch if already stored)
- Add configurable limits and rate limiting

## Milestone 2 – Feed API (for TikTok-style scrolling)
- `GET /feed?limit=20&cursor=...`
- Cursor pagination by `scraped_at` + `article_id`
- Return: title, short summary (stub), source, time

## Milestone 3 – Summaries (AI stub first)
- Create `SummarizerClient` interface
- Start with a fake summarizer (first N sentences)
- Save summaries in DB
- Later replace with real LLM calls

## Milestone 4 – Similarity and clustering
- Start simple: hash-based near-duplicate (title similarity)
- Then embeddings + pgvector
- Build story clusters and serve clusters in feed
