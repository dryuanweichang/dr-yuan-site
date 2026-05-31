CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  source_path TEXT,
  answers_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  judgement TEXT,
  current_revenue REAL,
  customer_base REAL,
  target_pool REAL,
  base_penetration REAL,
  local_revenue_mid REAL,
  channel_total REAL,
  mid_share REAL,
  ip TEXT,
  user_agent TEXT,
  email_sent INTEGER DEFAULT 0,
  email_error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_submitted_at ON leads(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
