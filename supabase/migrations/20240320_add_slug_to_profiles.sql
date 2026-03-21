ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Allow public read access to profiles for the booking page
CREATE POLICY "Public profiles are viewable by everyone."
ON profiles FOR SELECT
USING (is_public = true);