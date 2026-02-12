# NewsFlash

Monorepo for NewsFlash.

## Structure

- `apps/api/` – Kotlin + Spring Boot backend (current working app)
- `apps/web/` – Frontend placeholder (to be added)
- `services/` – Future framework-agnostic services (ingestion, summarization, ranking, etc.)
- `packages/` – Shared libraries (future)
- `docs/` – Project documentation

## Build & test

Run backend tests from repo root:

```zsh
./gradlew :apps:api:test
```

## Run backend

Start the Spring Boot app:

```zsh
./gradlew :apps:api:bootRun
```

Health check (Actuator):

```zsh
curl -i http://localhost:8080/actuator/health
```
