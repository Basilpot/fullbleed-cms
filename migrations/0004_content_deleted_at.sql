ALTER TABLE content ADD COLUMN deleted_at TEXT;
CREATE INDEX content_workspace_trash_idx ON content(workspace_id, deleted_at);
