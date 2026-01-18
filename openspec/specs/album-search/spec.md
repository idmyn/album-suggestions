# album-search Specification

## Purpose
Semantic search over album blurbs, enabling users to discover albums by mood, genre, or description (e.g., "dreamy shoegaze", "upbeat jazz").
## Requirements
### Requirement: Album Embedding Storage

The system SHALL store a vector embedding for each album suggestion's blurb in the `album_suggestions` table using a `F32_BLOB(1536)` column.

#### Scenario: New album has embedding generated

- **WHEN** a new album suggestion is inserted via the cron worker
- **THEN** an embedding is generated from the blurb text using OpenRouter's embeddings API
- **AND** the embedding is stored in the `blurb_embedding` column

#### Scenario: Embedding generation fails

- **WHEN** the OpenRouter embeddings API call fails
- **THEN** the album suggestion is still inserted with a NULL embedding
- **AND** an error is logged

### Requirement: Semantic Album Search

The system SHALL provide a search endpoint that finds albums semantically similar to a user's query text.

#### Scenario: User searches for albums

- **WHEN** a user submits a search query (e.g., "melancholic piano jazz")
- **THEN** the system generates an embedding for the query
- **AND** returns up to 10 albums ranked by cosine similarity to the query embedding

#### Scenario: No matching albums

- **WHEN** a user searches and no albums exceed the similarity threshold
- **THEN** the system returns an empty result set

### Requirement: Search User Interface

The system SHALL provide a search page where users can enter a query and view matching albums.

#### Scenario: User performs search from UI

- **WHEN** a user navigates to the search page and enters a query
- **THEN** the page displays matching albums as cards with cover art, title, artist, and blurb excerpt

#### Scenario: Search page is accessible from navigation

- **WHEN** a user is on any page of the website
- **THEN** they can navigate to the search page via the site navigation

