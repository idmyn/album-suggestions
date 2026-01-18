# Design Validation Tasks

Minimal test plan to validate the semantic search approach before full implementation.

## Goal

Test all 3 critical unknowns with a single script:

1. OpenRouter embeddings API works and returns 1536 dimensions
2. Turso vector storage works with F32_BLOB
3. `vector_top_k` query returns sensible results

## Steps

### 1. Add Column (Manual, No Migration)

```sql
ALTER TABLE album_suggestions ADD COLUMN blurb_embedding F32_BLOB(1536);
```

Run via Turso CLI against production (safe: nullable column).

### 2. Create Test Script

Create `cron/src/test-embeddings.ts` that:

- [ ] Fetch one existing album blurb from DB
- [ ] Call OpenRouter `POST /api/v1/embeddings` with that blurb
- [ ] Verify response has 1536 dimensions
- [ ] Update the row with embedding via raw SQL
- [ ] Call embeddings API with test query ("dreamy shoegaze")
- [ ] Run `vector_top_k` to find similar albums
- [ ] Log whether inserted album appears in results

### 3. Run Test

```bash
fnox -P dev exec bun run cron/src/test-embeddings.ts
```

## Why This Approach

- No Drizzle schema changes or migrations needed yet
- No new services/layers — plain Effect script reusing existing DB/config patterns
- Tests all critical unknowns in one pass
- Safe to run against production (nullable column, single test row)
- ~30 min to implement and run

## Success Criteria

- [ ] Embeddings API returns valid 1536-dimension vector
- [ ] Vector stored successfully in Turso
- [ ] `vector_top_k` query executes without error
- [ ] Test query returns the seeded album (basic sanity check)

## Next Steps (After Validation)

If successful, proceed with full implementation per tasks.md.
If issues found, update design.md with learnings before continuing.
