# Tasks: Add Album Search

## 1. Schema & Migration
- [ ] 1.1 Add `blurb_embedding` column (`F32_BLOB(1536)`) to `album_suggestions` in schema.ts
- [ ] 1.2 Create migration file
- [ ] 1.3 Run migration on Turso

## 2. Embedding Generation (cron/)
- [ ] 2.1 Create OpenRouter embeddings service (Effect-TS)
- [ ] 2.2 Integrate embedding generation into album suggestion pipeline
- [ ] 2.3 Store embeddings when inserting album suggestions

## 3. Backfill Existing Data
- [ ] 3.1 Write backfill script to generate embeddings for existing albums
- [ ] 3.2 Run backfill on production

## 4. Vector Index
- [ ] 4.1 Create vector index on `blurb_embedding` column
- [ ] 4.2 Verify index works with test queries

## 5. Search API (website/)
- [ ] 5.1 Create `/api/search` endpoint
- [ ] 5.2 Generate query embedding from user input
- [ ] 5.3 Execute `vector_top_k` query and return results

## 6. Search UI (website/)
- [ ] 6.1 Create search page with input field
- [ ] 6.2 Display search results as album cards
- [ ] 6.3 Add search link to navigation

## 7. Testing
- [ ] 7.1 Test embedding generation in cron
- [ ] 7.2 Test search API returns relevant results
- [ ] 7.3 Manual E2E test of search flow
