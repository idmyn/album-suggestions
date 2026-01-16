ALTER TABLE `album_suggestions` ADD `blurb_embedding` F32_BLOB(1536);--> statement-breakpoint
CREATE INDEX album_suggestions_blurb_embedding_idx 
  ON album_suggestions(libsql_vector_idx(blurb_embedding));