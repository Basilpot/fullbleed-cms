-- Public team profiles (staff shown on a workspace's website). Not to be
-- confused with memberships, which are dashboard accounts.
CREATE TABLE team_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  profession TEXT,
  qualification TEXT,
  description TEXT,
  license TEXT,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX team_members_workspace ON team_members (workspace_id, created_at);
