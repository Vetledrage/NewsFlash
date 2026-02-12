# NewsFlash Web (TikTok-style feed)

Mobile-first Next.js app that renders a vertical, snap-scrolling news feed.

## Prereqs

- Node.js 20+
- Running API at `http://localhost:8080` (default)

## Env

Create `apps/web/.env.local`:

- `API_BASE_URL=http://localhost:8080`

The web app calls its own Next.js route (`/api/articles`) which proxies to the Spring API.

## Dev

```bash
cd apps/web
npm install
npm run dev
```

## Tests

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

