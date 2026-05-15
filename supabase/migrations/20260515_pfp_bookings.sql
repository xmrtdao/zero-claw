-- Create bookings table for Party Favor Photo
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Client info
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  
  -- Event details
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  duration_hours INT NOT NULL DEFAULT 2,
  venue_name TEXT,
  venue_address TEXT,
  
  -- Package
  package_name TEXT NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  addons JSONB DEFAULT '[]',
  total_price DECIMAL(10,2) NOT NULL,
  
  -- Stripe
  payment_link TEXT,
  stripe_session_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'lead',
  deposit_paid BOOLEAN DEFAULT false,
  balance_paid BOOLEAN DEFAULT false,
  
  -- Notes
  notes TEXT,
  template_choice TEXT,
  custom_logo_url TEXT,
  
  -- Source tracking
  source TEXT DEFAULT 'website'
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(client_email);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
