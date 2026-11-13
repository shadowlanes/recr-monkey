-- Payment sources become optional metadata on a recurring payment.
-- Deleting a source must no longer delete the payments charged to it.
ALTER TABLE recurring_payments
  ALTER COLUMN payment_source_id DROP NOT NULL;

ALTER TABLE recurring_payments
  DROP CONSTRAINT IF EXISTS recurring_payments_payment_source_id_fkey;

ALTER TABLE recurring_payments
  ADD CONSTRAINT recurring_payments_payment_source_id_fkey
    FOREIGN KEY (payment_source_id) REFERENCES payment_sources(id) ON DELETE SET NULL;

-- Per-user preferences (display currency follows the user across devices)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  display_currency TEXT NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user') THEN
    ALTER TABLE user_preferences
      DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey,
      ADD CONSTRAINT user_preferences_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
  END IF;
END $$;
