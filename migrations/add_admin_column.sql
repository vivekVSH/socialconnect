-- Add is_admin column to profiles table if it doesn't exist
-- This ensures the column exists for admin functionality

-- Check if the column exists and add it if it doesn't
DO $$ 
BEGIN
    -- Add is_admin column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_admin column to profiles table';
    ELSE
        RAISE NOTICE 'is_admin column already exists in profiles table';
    END IF;
END $$;

-- Verify the column exists and show current admin users
SELECT 
    id, 
    email, 
    username, 
    first_name, 
    last_name, 
    is_admin, 
    created_at 
FROM profiles 
ORDER BY created_at ASC;
