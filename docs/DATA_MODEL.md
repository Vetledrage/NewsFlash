# Data Model

## v1: `articles` table (exists)
Table: `articles`

Columns:
- `article_id` (PK)          – internal ID, e.g. `VG:abc123`
- `source`                  – e.g. `VG`
- `external_id`             – ID from the source URL, e.g. VG’s `/i/<id>`
- `url`
- `title`
- `body`                    – extracted raw body text
- `scraped_at`              – when we scraped it

Constraints:
- `unique(source, external_id)` (prevents duplicates per source)

Notes:
- The API currently returns the latest articles ordered by `scraped_at` (see `ArticleRepository.findTop50ByOrderByScrapedAtDesc`).

## v2: summaries (planned)
Add fields or new table:

Option A: columns on `articles`:
- `summary_text`
- `summary_bullets` (json/text)
- `summary_updated_at`

Option B: separate table (cleaner):
`article_summaries`:
- `article_id` (FK)
- `format` (ENUM: FEED, BULLETS, TLDR)
- `content` (TEXT)
- `created_at`

## v3: similarity / clustering (planned)
`article_embeddings`:
- `article_id` (FK)
- `model`
- `embedding` (vector)
- `created_at`

`story_clusters`:
- `cluster_id` (PK)
- `created_at`

`cluster_members`:
- `cluster_id` (FK)
- `article_id` (FK)
- `score`
