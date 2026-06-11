CREATE TABLE emails (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  "from" TEXT NOT NULL,
  subject TEXT,
  "to" TEXT,
  cc TEXT,
  bcc TEXT,
  reply_to TEXT,
  html TEXT,
  text TEXT,
  message_id TEXT,
  attachments TEXT,
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_emails_to ON emails("to");
CREATE INDEX idx_emails_created_at ON emails(created_at);