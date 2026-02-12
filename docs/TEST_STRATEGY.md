# Test Strategy

## Tools
- JUnit 5
- Spring Boot Test
- Prefer slice tests where it makes sense:
  - `@DataJpaTest` for repositories
  - pure unit tests for parsing logic
- Later: Testcontainers for PostgreSQL integration tests

## Current test setup (as of now)
- Tests run with Spring profile `test` (set in Gradle test task).
- Scheduling is disabled in `test` profile (see `SchedulingConfig @Profile("!test")` + `spring.task.scheduling.enabled: false`).
- Scraping is disabled in `test` profile via `scraper.enabled: false`.

This ensures that `./gradlew :apps:api:test` is deterministic and does not perform real scraping/network work.

## Test layers

### 1) Unit tests (future)
Goal: HTML parsing/extraction should be covered by unit tests with fixtures.
- Given saved HTML fixture, extractor returns:
  - title
  - body
  - canonical url
  - externalId

These tests must not hit the network.

### 2) Repository tests (exists)
- Flyway migration runs
- save/find works
- unique constraints behave as expected (no duplicates)

Example: `repoTest.ArticleRepositoryTest`.

### 3) Integration / smoke tests (exists)
- Start Spring context and verify it boots.
- Verify key endpoints respond.

Examples:
- `app.ActuatorHealthSmokeTest`
- `app.ScraperToggleTest` (verifies CrawlJob bean isn’t created when scraper is disabled)

## Important rule
Avoid real network calls in tests.
If/when we add scraping tests, use stored HTML fixtures under something like:
`apps/api/src/test/resources/fixtures/vg/...`
