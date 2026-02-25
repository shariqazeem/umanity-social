-- Umanity: Notifications Table
-- Run this in the Supabase SQL Editor

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_address TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'donation',
  message TEXT NOT NULL,
  from_username TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by recipient + unread status
CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON notifications(recipient_address, read);

-- Index for ordering by created_at
CREATE INDEX IF NOT EXISTS idx_notifications_created
  ON notifications(created_at DESC);

-- Enable RLS (permissive for hackathon)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on notifications" ON notifications
  FOR ALL USING (true) WITH CHECK (true);
