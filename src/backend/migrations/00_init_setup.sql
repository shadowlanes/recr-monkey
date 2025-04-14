CREATE TABLE payment_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  identifier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE recurring_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  frequency TEXT NOT NULL,
  payment_source_id UUID REFERENCES payment_sources(id) NOT NULL,
  start_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_sources ENABLE ROW LEVEL SECURITY;

-- Create policy to only allow users to see their own payment sources
CREATE POLICY "Users can only view their own payment sources"
  ON payment_sources
  FOR ALL
  USING (auth.uid() = user_id);


  -- Enable RLS
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;

-- Create policy to only allow users to see their own recurring payments
CREATE POLICY "Users can only view their own recurring payments"
  ON recurring_payments
  FOR ALL
  USING (auth.uid() = user_id);