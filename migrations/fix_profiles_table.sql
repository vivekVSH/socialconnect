-- Fix profiles table structure for search functionality
-- This ensures the profiles table has all necessary columns and proper RLS

-- First, let's check if profiles table exists and has the right structure
-- Add missing columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create unique index on username if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Update RLS policies to allow public read access for search
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create a view for public profiles if it doesn't exist
CREATE OR REPLACE VIEW profiles_public AS
SELECT 
  id,
  username,
  first_name,
  last_name,
  bio,
  avatar_url,
  created_at
FROM profiles
WHERE username IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON profiles_public TO anon, authenticated;
