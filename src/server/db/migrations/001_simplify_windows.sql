-- Remove label column and keep only active
CREATE TABLE IF NOT EXISTS new_windows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  active BOOLEAN DEFAULT 1
);

-- Copy data from old table to new table
INSERT INTO new_windows (id, active)
SELECT id, active FROM windows;

-- Drop old table
DROP TABLE windows;

-- Rename new table to windows
ALTER TABLE new_windows RENAME TO windows;

-- Recreate required indexes
CREATE INDEX IF NOT EXISTS idx_windows_active ON windows(active);
