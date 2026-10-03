-- Raise the per-workspace member cap. SQLite can't ALTER COLUMN ... SET DEFAULT,
-- so new workspaces pass member_limit explicitly on insert (see app/api/auth/register).
UPDATE workspaces SET member_limit = 5;
