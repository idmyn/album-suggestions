# Tasks: Add Album Search

Validated via `cron/src/test-embeddings.ts` — all critical unknowns confirmed working.

## 1. Schema & Migration

- [x] 1.1 Define `float32Array` custom type in schema.ts using Drizzle `customType`:
  ```typescript
  const float32Array = customType<{
  	data: number[];
  	config: { dimensions: number };
  	configRequired: true;
  	driverData: Buffer;
  }>({
  	dataType(config) {
  		return `F32_BLOB(${config.dimensions})`;
  	},
  	fromDriver(value: Buffer) {
  		return Array.from(new Float32Array(value.buffer));
  	},
  	toDriver(value: number[]) {
  		return sql`vector32(${JSON.stringify(value)})`;
  	},
  });
  ```
- [x] 1.2 Add `blurbEmbedding` column to `albumSuggestions` table:
  ```typescript
  blurbEmbedding: float32Array("blurb_embedding", { dimensions: 1536 }),
  ```
- [x] 1.3 Generate migration: `bun run drizzle-kit generate` (in shared/)
- [x] 1.4 Add vector index to migration file (Drizzle doesn't support `libsql_vector_idx` natively):
  ```sql
  CREATE INDEX album_suggestions_blurb_embedding_idx
    ON album_suggestions(libsql_vector_idx(blurb_embedding));
  ```
- [x] 1.5 Apply migration: `fnox -P staging exec bun run drizzle-kit migrate` (in shared/)

## 2. Embedding Service (shared/)

- [x] 2.1 Create `shared/src/embeddings/service.ts` with Effect-TS service
  - Reuse patterns from test-embeddings.ts: `HttpClientRequest.bodyJson()` → `Effect.flatMap(client.execute)`
  - Model: `openai/text-embedding-3-small`, 1536 dimensions
  - Export `EmbeddingService` with `generateEmbedding(text: string)` and `generateEmbeddings(texts: string[])`
- [x] 2.2 Export from shared/index.ts

## 3. Cron Integration (cron/)

- [x] 3.1 Import EmbeddingService into cron/src/main.ts
- [x] 3.2 After `db.insertWeeklyBatch()`, generate embeddings for all blurbs in batch
- [x] 3.3 Update album_suggestions rows with embeddings via raw SQL:
  ```sql
  UPDATE album_suggestions SET blurb_embedding = ? WHERE id = ?
  ```

## 4. Backfill Script

- [x] 4.1 Create `cron/src/backfill-embeddings.ts`
  - Query albums where `blurb_embedding IS NULL`
  - Batch embed (OpenRouter supports array input)
  - Update rows with embeddings
- [x] 4.2 Run backfill: `fnox -P staging exec bun run cron/src/backfill-embeddings.ts`

## 5. Search API (website/)

- [x] 5.1 Create `website/src/routes/api/search/+server.ts`
  - Accept `?q=` query param
  - Generate query embedding via EmbeddingService
  - Execute: `SELECT ... vector_distance_cos(blurb_embedding, ?) as distance ... ORDER BY distance LIMIT 10`
  - Return JSON: `{ albums: [...], query: string }`
- [ ] 5.2 Add OPENROUTER_API_KEY to website env (already in fnox.toml shared secrets)

## 6. Search UI (website/)

- [x] 6.1 Create `website/src/routes/search/+page.svelte`
  - Text input with debounced search
  - Display album cards (reuse existing component)
- [x] 6.2 Add search link to nav

## 7. Cleanup

- [ ] 7.1 Delete `cron/src/test-embeddings.ts` (validation complete)
- [ ] 7.2 Archive this change proposal

## Implementation Order

1. Schema (1) → Embedding Service (2) → Cron Integration (3)
2. Backfill (4)
3. Search API (5) → Search UI (6)
4. Cleanup (7)

## Key Patterns (from Turso docs + validation)

```typescript
// Custom Drizzle type for F32_BLOB (in schema.ts)
const float32Array = customType<{
	data: number[];
	config: { dimensions: number };
	configRequired: true;
	driverData: Buffer;
}>({
	dataType(config) {
		return `F32_BLOB(${config.dimensions})`;
	},
	fromDriver(value: Buffer) {
		return Array.from(new Float32Array(value.buffer));
	},
	toDriver(value: number[]) {
		return sql`vector32(${JSON.stringify(value)})`;
	},
});

// Embedding API call (use schemaBodyJson for request + response)
const EmbeddingRequest = Schema.Struct({
	input: Schema.Union(Schema.String, Schema.Array(Schema.String)),
	model: Schema.String,
	dimensions: Schema.Number,
});

const EmbeddingResponse = Schema.Struct({
	data: Schema.Array(
		Schema.Struct({
			embedding: Schema.Array(Schema.Number),
			index: Schema.Number,
		}),
	),
	model: Schema.String,
});

const response =
	yield *
	HttpClientRequest.schemaBodyJson(EmbeddingRequest)(
		HttpClientRequest.post("https://openrouter.ai/api/v1/embeddings").pipe(
			HttpClientRequest.setHeader("Authorization", `Bearer ${apiKey}`),
		),
		{ input: text, model: "openai/text-embedding-3-small", dimensions: 1536 },
	).pipe(
		Effect.flatMap(client.execute),
		Effect.flatMap(HttpClientResponse.schemaBodyJson(EmbeddingResponse)),
		Effect.scoped,
	);

// Vector search query (pass number[] directly, customType handles conversion)
sql`SELECT ... vector_distance_cos(s.blurb_embedding, vector32(${JSON.stringify(queryEmbedding)})) as distance
    FROM album_suggestions s ... WHERE s.blurb_embedding IS NOT NULL
    ORDER BY distance ASC LIMIT 10`;
```
