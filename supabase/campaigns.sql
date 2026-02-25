-- Umanity: Campaigns & Milestones Schema
-- Run this in the Supabase SQL Editor

-- Campaigns table (escrow overlay on existing pools)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  target_amount DECIMAL NOT NULL,
  total_raised DECIMAL DEFAULT 0,
  deadline TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Campaign milestones table
CREATE TABLE IF NOT EXISTS campaign_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  index INT NOT NULL,
  description TEXT NOT NULL,
  percentage INT NOT NULL,
  status TEXT DEFAULT 'pending',
  governance_proposal_id UUID,
  created_at TIMESTAMP DEFAULT now()
);

-- Add campaign/milestone columns to governance_proposals
ALTER TABLE governance_proposals
  ADD COLUMN IF NOT EXISTS campaign_id UUID,
  ADD COLUMN IF NOT EXISTS milestone_index INT,
  ADD COLUMN IF NOT EXISTS proposal_type TEXT DEFAULT 'general';

-- Enable RLS (with permissive policies for hackathon)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on campaigns" ON campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on campaign_milestones" ON campaign_milestones FOR ALL USING (true) WITH CHECK (true);
