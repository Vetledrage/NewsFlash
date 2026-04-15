# NewsFlash

Monorepo for NewsFlash.

## Structure

- `apps/api/` – Kotlin + Spring Boot backend (current working app)
- `apps/web/` – Next.js frontend (TikTok-style vertical feed)
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

## Run API + Web (recommended)

One command to start both the API and the Next.js web app:

```zsh
./scripts/dev.sh
```

Defaults:
- API: `http://localhost:8080`
- Web: `http://localhost:3000`

Overrides:

```zsh
API_PORT=8080 WEB_PORT=3000 API_BASE_URL=http://localhost:8080 ./scripts/dev.sh
```
```
