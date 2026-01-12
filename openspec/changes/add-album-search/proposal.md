# Change: Add Semantic Album Search

## Why
Users currently have no way to search or discover albums beyond browsing the weekly lists chronologically. Semantic search over album blurbs would let users find albums by mood, genre, or vibe description.

## What Changes
- **BREAKING**: Schema migration adds `blurb_embedding` column to `album_suggestions` table
- Add vector index for similarity search using Turso's native vector support
- Generate embeddings via OpenRouter's embeddings API when albums are inserted
- Add search endpoint/page to website for querying albums by text

## Impact
- Affected specs: `album-search` (new capability)
- Affected code:
  - `shared/src/db/schema.ts` — add vector column
  - `cron/` — generate embeddings during album ingestion
  - `website/` — search UI and API route
