# Data Model

## v1: articles table (already exists)
articles:
- article_id (PK)          -- internal ID e.g. "VG:abc123"
- source (NEW)             -- "VG"
- external_id (NEW)        -- "abc123"
- url
- title
- body                     -- raw extracted body
- scraped_at

Constraints:
- unique(source, external_id)

Indexes:
- index on scraped_at desc
- index on source

## v2: summaries
Add fields or new table:
Option A: columns on articles:
- summary_text
- summary_bullets (json/text)
- summary_updated_at

Option B: separate table (cleaner):
article_summaries:
- article_id (FK)
- format (ENUM: FEED, BULLETS, TLDR)
- content (TEXT)
- created_at

## v3: similarity / clustering
article_embeddings:
- article_id (FK)
- model
- embedding (vector)
- created_at

story_clusters:
- cluster_id (PK)
- created_at

cluster_members:
- cluster_id (FK)
- article_id (FK)
- score
