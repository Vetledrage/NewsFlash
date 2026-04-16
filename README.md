# NewsFlash

Monorepo for NewsFlash — a TikTok-style vertical news feed.

## Structure

- `apps/api/` – Kotlin + Spring Boot backend
- `apps/web/` – Next.js frontend (TikTok-style vertical feed)
- `services/` – Future microservices (ingestion, summarization, ranking, etc.)
- `packages/` – Shared libraries (future)
- `docs/` – Project documentation

## Prerequisites

- **Java 17+** (for the API)
- **Node.js 18+** and **npm** (for the frontend)

## Run the API

```zsh
./gradlew :apps:api:bootRun
```

The API starts at **http://localhost:8080**.

Health check:

```zsh
curl http://localhost:8080/actuator/health
```

## Run the Frontend

```zsh
cd apps/web
npm install   # first time only
npm run dev
```

The frontend starts at **http://localhost:3000**.

## Run Both (two terminals)

**Terminal 1 — API:**

```zsh
./gradlew :apps:api:bootRun
```

**Terminal 2 — Web:**

```zsh
cd apps/web && npm run dev
```

## Run Tests

Backend:

```zsh
./gradlew :apps:api:test
```

Frontend:

```zsh
cd apps/web && npm test
```
