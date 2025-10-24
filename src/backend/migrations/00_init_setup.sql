-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Application tables (payment_sources and recurring_payments)
-- User table will be created by better-auth CLI

CREATE TABLE IF NOT EXISTS payment_sources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL, -- Will reference "user"(id) after better-auth creates the user table
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  identifier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recurring_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL, -- Will reference "user"(id) after better-auth creates the user table
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  frequency TEXT NOT NULL,
  payment_source_id TEXT REFERENCES payment_sources(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  category TEXT DEFAULT 'Other',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints (run this after better-auth creates the user table)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user') THEN
    ALTER TABLE payment_sources 
      DROP CONSTRAINT IF EXISTS payment_sources_user_id_fkey,
      ADD CONSTRAINT payment_sources_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
    
    ALTER TABLE recurring_payments 
      DROP CONSTRAINT IF EXISTS recurring_payments_user_id_fkey,
      ADD CONSTRAINT recurring_payments_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
  END IF;
END $$;
