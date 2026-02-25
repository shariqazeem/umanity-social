-- Umanity Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard > SQL Editor)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  address TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  total_received DECIMAL DEFAULT 0,
  total_sent DECIMAL DEFAULT 0,
  total_donated DECIMAL DEFAULT 0,
  reward_points INTEGER DEFAULT 50,
  tip_count_received INTEGER DEFAULT 0,
  tip_count_sent INTEGER DEFAULT 0,
  donation_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donations table (one-tap donations)
CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,
  donor TEXT NOT NULL REFERENCES users(address),
  amount DECIMAL NOT NULL,
  signature TEXT NOT NULL,
  type TEXT DEFAULT 'one-tap',
  reward_points_earned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Pools table
CREATE TABLE IF NOT EXISTS pools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  total_donated DECIMAL DEFAULT 0,
  donor_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default pools
INSERT INTO pools (id, name, description) VALUES
  ('medical', 'Medical Aid', 'Support healthcare initiatives and medical research worldwide'),
  ('education', 'Education Fund', 'Fund educational programs and scholarships for underserved communities'),
  ('disaster', 'Disaster Relief', 'Provide immediate aid and long-term recovery for disaster-affected regions'),
  ('water', 'Clean Water', 'Build water infrastructure and provide clean drinking water access')
ON CONFLICT (id) DO NOTHING;

-- Pool donations table
CREATE TABLE IF NOT EXISTS pool_donations (
  id TEXT PRIMARY KEY,
  donor TEXT NOT NULL REFERENCES users(address),
  pool_id TEXT NOT NULL REFERENCES pools(id),
  pool_name TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  signature TEXT NOT NULL,
  reward_points_earned INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Tips table
CREATE TABLE IF NOT EXISTS tips (
  id TEXT PRIMARY KEY,
  sender TEXT NOT NULL REFERENCES users(address),
  recipient TEXT NOT NULL REFERENCES users(address),
  recipient_username TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  message TEXT DEFAULT '',
  signature TEXT NOT NULL,
  reward_points_earned INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Governance proposals
CREATE TABLE IF NOT EXISTS governance_proposals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  creator_address TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  options JSONB NOT NULL,
  status TEXT DEFAULT 'active',
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closes_at TIMESTAMPTZ NOT NULL
);

-- Governance votes
CREATE TABLE IF NOT EXISTS governance_votes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proposal_id TEXT NOT NULL REFERENCES governance_proposals(id),
  voter_address TEXT NOT NULL,
  vote_option INTEGER NOT NULL,
  vote_weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, voter_address)
);

-- Impact NFTs
CREATE TABLE IF NOT EXISTS impact_nfts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_address TEXT NOT NULL,
  donation_id TEXT,
  cause_name TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  tier TEXT NOT NULL,
  mint_signature TEXT,
  metadata_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (allow all for now - tighten in production)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_nfts ENABLE ROW LEVEL SECURITY;

-- Policies (allow all operations with anon key for hackathon)
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON donations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON pools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON pool_donations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON tips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON governance_proposals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON governance_votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON impact_nfts FOR ALL USING (true) WITH CHECK (true);
