CREATE INDEX post_fts_idx ON "Post" USING GIN (to_tsvector('english', title || ' ' || description));
