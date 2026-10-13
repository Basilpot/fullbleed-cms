-- Manual display order for team profiles (dashboard drag-and-drop). Existing
-- rows keep their creation order; new rows are appended (MAX(position) + 1).
ALTER TABLE team_members ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

UPDATE team_members SET position = (
  SELECT COUNT(*) FROM team_members AS earlier
  WHERE earlier.workspace_id = team_members.workspace_id
    AND (earlier.created_at < team_members.created_at
      OR (earlier.created_at = team_members.created_at AND earlier.rowid < team_members.rowid))
);

DROP INDEX IF EXISTS team_members_workspace;
CREATE INDEX team_members_workspace ON team_members (workspace_id, position);
