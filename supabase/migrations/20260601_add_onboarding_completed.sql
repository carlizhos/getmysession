-- Add onboarding_completed flag to track whether a user has finished the initial setup wizard
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
