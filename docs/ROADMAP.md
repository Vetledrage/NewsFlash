# Roadmap (Incremental)

## Milestone 1 – Make scraping robust (no AI yet)
- Add source + externalId fields
- Make unique constraint (source, externalId)
- Refactor VG logic into vg-specific classes
- Add unit tests using HTML fixtures

## Milestone 2 – Feed API (for TikTok-style scrolling)
- GET /feed?limit=20&cursor=...
- Returns: title, short summary, source, time
- Cursor pagination by scraped_at + article_id

## Milestone 3 – Summaries (AI stub first)
- Create SummarizerClient interface
- Start with a fake summarizer (first N sentences)
- Save summaries in DB
- Later replace with real LLM calls

## Milestone 4 – Similarity and clustering
- Start simple: hash-based near-duplicate (title similarity)
- Then embeddings + pgvector
- Build “story clusters” and serve clusters in feed
