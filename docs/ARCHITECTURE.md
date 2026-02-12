# NewsFlash Architecture

## Repo layout (current)
This repository is a monorepo.

- `apps/api/` – Kotlin + Spring Boot backend (runs as the API)
- `apps/web/` – frontend placeholder (not implemented yet)
- `services/` – placeholder folders for future framework-agnostic services
- `docs/` – documentation

The backend is currently a single Spring Boot app under `apps/api` (we can split into multiple Gradle modules later if/when needed).

## Backend structure (current)
Current Kotlin packages inside `apps/api/src/main/kotlin/app/`:

- `app.controller` – HTTP layer (Spring MVC controllers)
  - `ArticleController` exposes `GET /api/articles`
- `app.service` – service layer (business logic)
  - `ArticleService` maps entities → DTO and handles sorting/limits
- `app.repository` – persistence layer
  - `ArticleRepository` (Spring Data JPA)
- `app.model` – JPA entities
  - `Article`
- `app` – scraping/ingestion logic (MVP)
  - `Crawler`, `ScrapeService`, and scheduled `CrawlJob`

> Note: Scraping is still implemented inside the API app today (MVP). Target direction is to move source-specific crawling/scraping into `services/ingestion` (framework-agnostic) and make the API purely a read/write layer.

## Scheduling and scraping (feature toggles)
Scraping is explicitly gated behind a feature toggle:

- Property: `scraper.enabled`
  - default in `application.yml`: `true`
  - in `application-test.yml`: `false` (no scraping in tests)

`CrawlJob` is only registered as a bean when `scraper.enabled=true` via `@ConditionalOnProperty`.

Scheduling is enabled in all profiles except `test`:

- `app.config.SchedulingConfig` has `@EnableScheduling` and `@Profile("!test")`

This keeps CI/test runs deterministic and prevents background jobs from affecting tests.

## Runtime flow (today)
### Scraping flow (when enabled)
Scheduler (`CrawlJob`) → Frontpage crawling (`Crawler`) → Per-article scrape (`ScrapeService`) → Persist (`ArticleRepository`)

### API flow
HTTP request → Controller (`ArticleController`) → Service (`ArticleService`) → Repository (`ArticleRepository`) → DB

## Future flow (target)
- Ingestion (crawler/scraper) runs separately (worker or service module)
- API serves articles/feed from DB
- Later, AI processing (summaries/embeddings) runs async and stores results

## Database & migrations
- Flyway migrations live under `apps/api/src/main/resources/db/migration`
- H2 is used by default for local/dev today; PostgreSQL is already included as a runtime dependency for future production use.

## Environments / profiles
- `application.yml` – default config (no hard-coded secrets)
- `application-dev.yml` – dev-only overrides (e.g., H2 console)
- `application-test.yml` – test profile (scheduling off, scraper disabled)
