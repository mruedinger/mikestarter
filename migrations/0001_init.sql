CREATE TABLE pledges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  venmo_handle TEXT NOT NULL,
  is_private INTEGER NOT NULL DEFAULT 1,
  is_paid INTEGER NOT NULL DEFAULT 0,
  edit_token TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_pledges_created_at ON pledges(created_at DESC);
