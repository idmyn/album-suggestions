# Design: Album Search

## Context
The album-suggestions app stores weekly AI-generated album recommendations with blurbs. Users want to search by description (e.g., "dreamy shoegaze" or "upbeat jazz"). Turso/libSQL has native vector search; OpenRouter now provides an embeddings API.

## Goals / Non-Goals
**Goals:**
- Enable semantic search over album blurbs
- Reuse existing OpenRouter dependency for embeddings
- Keep implementation simple (single search page)

**Non-Goals:**
- Full-text keyword search (may add later)
- Hybrid search (vector + filters)
- Sub-100ms search latency (we accept ~200-300ms for query embedding generation)

## Decisions

### Embedding Model
**Decision:** Use `openai/text-embedding-3-small` via OpenRouter
- 1536 dimensions, good quality/cost balance
- Same API key already configured for LLM calls
- $0.02/M tokens — negligible cost for small corpus

**Alternatives considered:**
- `text-embedding-3-large` — let's see how we get on with the cheaper one first

### Vector Storage
**Decision:** Add `F32_BLOB(1536)` column to `album_suggestions` table
- Native Turso support, no extension needed
- Create `libsql_vector_idx` index for fast ANN queries

### Embedding Generation Timing
**Decision:** Generate embeddings in cron worker when albums are inserted
- Blurbs don't change after insertion
- Batch embedding API call for all albums in a weekly batch

### Search Implementation
**Decision:** Server-side search via SvelteKit API route
- Query embedding generated server-side
- `vector_top_k` returns top N matches
- Simple search input + results list

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Drizzle ORM doesn't support vector types | Use raw SQL for vector operations |
| OpenRouter embeddings API availability | Fallback: skip embedding, album still searchable by browse |
| Migration on existing data | Backfill script to generate embeddings for existing albums |

## Migration Plan
1. Add nullable `blurb_embedding` column (no breaking change)
2. Deploy cron changes to generate embeddings for new albums
3. Run backfill script for existing albums
4. Add vector index after backfill completes
5. Deploy search UI

**Rollback:** Drop column and index; search feature simply unavailable

## Resolved Questions
- **Show similarity score?** No — keep UI simple
- **Minimum similarity threshold?** TBD — tune after seeing real results
- **Result count?** 5-10 results
