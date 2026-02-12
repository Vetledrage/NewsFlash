# Test Strategy

## Tools
- JUnit 5
- Spring Boot Test
- Prefer slice tests:
    - @DataJpaTest for repositories
    - pure unit tests for parsing logic
- Later: Testcontainers for PostgreSQL integration tests

## Test layers

### 1) Unit tests (fast, no Spring)
- Given saved HTML fixture, extractor returns:
    - title
    - body
    - canonical url
    - externalId
      These tests should not hit the network.

### 2) Repository tests
- Flyway migration runs
- save/find works
- unique constraints behave as expected (no duplicates)

### 3) Integration test (one happy path)
- start Spring context
- run “crawl frontpage” with mocked HTML responses (no real VG calls)
- assert articles saved

## Important rule
Avoid real network calls in tests.
Use stored HTML fixtures under:
src/test/resources/fixtures/vg/...
