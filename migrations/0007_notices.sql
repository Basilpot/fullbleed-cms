CREATE TABLE notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'info' CHECK (variant IN ('info', 'warning', 'error')),
  link_url TEXT,
  link_label TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX notices_active_dates_idx ON notices(active, starts_at, ends_at);
