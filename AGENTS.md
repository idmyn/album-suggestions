When planning, sacrifice grammar for the sake of concision.

## Commands

- Typecheck: `bun run tsc` (all workspaces) or `bun run tsc` in workspace dir
- Test: `bun test` in cron/, single test: `bun test path/to/file.test.ts`
- Format: `bun run format`
- Dev: `fnox -P staging exec bun run dev` in website/ or cron/

## Architecture

- Bun monorepo with 3 workspaces: website/, cron/, shared/
- **cron/**: Cloudflare Worker that runs weekly to fetch album suggestions from AI (OpenRouter), enriches with Spotify metadata and SongLink URLs, stores in DB
- **website/**: SvelteKit+Cloudflare app displaying weekly album suggestions with links to streaming services
- **shared/**: DB schema (LibSQL/Turso + Drizzle ORM) and utilities
- Heavy use of Effect-TS for functional error handling and dependency injection

## Code Style

- Tabs for indentation (Prettier)
- Effect-TS patterns: use Effect.gen, Layer, Context for services
- TypeScript strict mode, verbatimModuleSyntax (use `import type` for types)
- Svelte 5 runes, Tailwind v4 in website/

## btca

Trigger: user says "use btca" (for codebase/docs questions).
Run: `btca ask -t <tech> -q "<question>"`
Available <tech>: effect
