# NewsFlash Architecture

## Modules (single Gradle project for now)
Keep it as one Spring Boot app initially. We can split into modules later if needed.

## Package structure (target)
app/
api/
ArticleController.kt
dto/
application/
CrawlJob.kt
CrawlFrontpageUseCase.kt
SummarizeArticleUseCase.kt
domain/
Article.kt
Source.kt
StoryCluster.kt
similarity/
infrastructure/
scraping/
SourceScraper.kt
vg/
VgFrontpageCrawler.kt
VgArticleScraper.kt
persistence/
ArticleEntity.kt
ArticleRepository.kt
Flyway migrations in resources
ai/
SummarizerClient.kt
EmbeddingClient.kt
(stub implementations first)

## Flow (today)
Scheduler -> Frontpage crawler -> Article scraper -> Save article

## Flow (target)
Scheduler -> Crawl frontpages (by source)
-> extract article URLs
-> scrape article (raw text, metadata)
-> upsert article (no duplicates)
-> enqueue AI processing (summary + embedding)
-> compute similarity and cluster into stories

## Database choice (recommendation)
Start with PostgreSQL for production, H2 for tests.
Reason: relational schema + constraints + Flyway migrations are simple and strong.
Vector search can be added later with:
- pgvector (if you stay in Postgres), or
- external vector DB (later, not now)

## “Don’t overbuild”
- Keep AI pipeline synchronous at first (process after save).
- Later we can add async queue/outbox.
