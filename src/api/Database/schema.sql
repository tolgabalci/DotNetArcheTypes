CREATE SCHEMA IF NOT EXISTS entries;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS entries.note_entries (
  id uuid PRIMARY KEY,
  user_id varchar(256) NOT NULL,
  description_markdown varchar(8000) NOT NULL,
  mermaid_source varchar(40000) NOT NULL,
  created_at timestamptz NOT NULL,
  modified_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_note_entries_user_id
  ON entries.note_entries (user_id);

CREATE INDEX IF NOT EXISTS ix_note_entries_user_id_modified_at
  ON entries.note_entries (user_id, modified_at DESC);

CREATE INDEX IF NOT EXISTS ix_note_entries_full_text
  ON entries.note_entries
  USING GIN (to_tsvector('english', coalesce(description_markdown, '') || ' ' || coalesce(mermaid_source, '')));

CREATE INDEX IF NOT EXISTS ix_note_entries_description_trgm
  ON entries.note_entries
  USING GIN (description_markdown gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ix_note_entries_mermaid_trgm
  ON entries.note_entries
  USING GIN (mermaid_source gin_trgm_ops);
