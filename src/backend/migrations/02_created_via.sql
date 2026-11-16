-- Which client created the row: web | api | mcp
ALTER TABLE recurring_payments
  ADD COLUMN IF NOT EXISTS created_via TEXT NOT NULL DEFAULT 'web';
