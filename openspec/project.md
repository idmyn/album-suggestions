# Project Context

## Purpose

Weekly album suggestion service that fetches AI-generated album recommendations, enriches them with streaming service metadata, and displays them in a browsable catalog.

Goals:

- Get suggested albums to listen to (weekly via AI)
- Display them nicely with a catalog of previous suggestions
- Potentially add vector similarity search for discovery

### Architecture Patterns

- **cron/**: Cloudflare Worker runs weekly to fetch album suggestions from OpenRouter AI, enriches with Spotify metadata and SongLink URLs, stores in DB
- **website/**: SvelteKit app displays weekly suggestions with streaming service links
- **shared/**: DB schema and utilities shared between workspaces

## Domain Context

- Albums are suggested weekly by an AI model via OpenRouter
- Each album is enriched with Spotify metadata (artist, cover art, etc.)
- SongLink/Odesli provides universal streaming links

## Important Constraints

- Cloudflare Workers runtime limitations
- Effect-TS patterns required for cron/ code

## External Dependencies

- **OpenRouter**: AI model API for generating album suggestions
- **Spotify API**: Album metadata enrichment
- **SongLink/Odesli API**: Universal streaming service URLs
- **Turso**: LibSQL database hosting
- **Cloudflare**: Workers (cron) and Pages (website) hosting
