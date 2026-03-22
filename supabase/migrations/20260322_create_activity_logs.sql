-- Migration: Create activity_logs table
-- Description: Table for storing user activity and notifications
-- Created: 2026-03-22

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- e.g. 'appointment_created', 'payment_received', 'patient_added'
  title TEXT NOT NULL,
  description TEXT,
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_profile_id ON activity_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_unread ON activity_logs(profile_id) WHERE read = false;

-- Enable Row Level Security (RLS)
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own activity logs" ON activity_logs
  FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own activity logs" ON activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own activity logs" ON activity_logs
  FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own activity logs" ON activity_logs
  FOR DELETE
  USING (auth.uid() = profile_id);

COMMENT ON TABLE activity_logs IS 'Stores user activity notifications like new appointments, payments, etc.';
