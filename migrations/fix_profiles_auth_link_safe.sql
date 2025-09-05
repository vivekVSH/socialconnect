-- Safe fix for profiles table to properly link with auth.users
-- This preserves existing data and creates proper relationships

-- First, let's check what we have in the current profiles table
SELECT COUNT(*) as profiles_count FROM profiles;
SELECT COUNT(*) as posts_count FROM posts;
SELECT COUNT(*) as auth_users_count FROM auth.users;

-- Create a backup of existing profiles data
CREATE TABLE IF NOT EXISTS profiles_backup AS 
SELECT * FROM profiles;

-- Check if profiles table has the right structure
-- If it doesn't have the auth.users reference, we need to fix it
DO $$
BEGIN
    -- Check if profiles table exists and has the right structure
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Check if the profiles table has the right foreign key constraint
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'profiles_id_fkey' 
            AND table_name = 'profiles'
        ) THEN
            -- The profiles table exists but doesn't have the right constraint
            -- We need to fix this carefully
            
            -- First, let's see what's in the profiles table
            RAISE NOTICE 'Profiles table exists but needs auth.users link';
            
            -- Create a temporary table with the correct structure
            CREATE TABLE profiles_temp (
                id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                email TEXT,
                username VARCHAR(50) UNIQUE,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                bio TEXT,
                avatar_url TEXT,
                website TEXT,
                location TEXT,
                role TEXT NOT NULL DEFAULT 'user',
                is_active BOOLEAN NOT NULL DEFAULT true,
                is_admin BOOLEAN DEFAULT FALSE,
                followers_count INT NOT NULL DEFAULT 0,
                following_count INT NOT NULL DEFAULT 0,
                posts_count INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Copy data from existing profiles to temp table
            -- Only copy profiles that have corresponding auth.users entries
            INSERT INTO profiles_temp (id, email, username, first_name, last_name, bio, avatar_url, website, location, role, is_active, is_admin, followers_count, following_count, posts_count, created_at, updated_at)
            SELECT p.id, p.email, p.username, p.first_name, p.last_name, p.bio, p.avatar_url, p.website, p.location, p.role, p.is_active, p.is_admin, p.followers_count, p.following_count, p.posts_count, p.created_at, p.updated_at
            FROM profiles p
            INNER JOIN auth.users u ON p.id = u.id;
            
            -- Drop the old profiles table
            DROP TABLE profiles CASCADE;
            
            -- Rename temp table to profiles
            ALTER TABLE profiles_temp RENAME TO profiles;
            
            RAISE NOTICE 'Profiles table recreated with proper auth.users link';
        ELSE
            RAISE NOTICE 'Profiles table already has proper auth.users link';
        END IF;
    ELSE
        -- Profiles table doesn't exist, create it
        CREATE TABLE profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT,
            username VARCHAR(50) UNIQUE,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            bio TEXT,
            avatar_url TEXT,
            website TEXT,
            location TEXT,
            role TEXT NOT NULL DEFAULT 'user',
            is_active BOOLEAN NOT NULL DEFAULT true,
            is_admin BOOLEAN DEFAULT FALSE,
            followers_count INT NOT NULL DEFAULT 0,
            following_count INT NOT NULL DEFAULT 0,
            posts_count INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Profiles table created with proper auth.users link';
    END IF;
END $$;

-- Ensure all foreign key constraints are properly set
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
ALTER TABLE follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
ALTER TABLE follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_author_id_fkey;

-- Recreate foreign key constraints
ALTER TABLE posts ADD CONSTRAINT posts_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE follows ADD CONSTRAINT follows_follower_id_fkey 
    FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE follows ADD CONSTRAINT follows_following_id_fkey 
    FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE likes ADD CONSTRAINT likes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE comments ADD CONSTRAINT comments_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Recreate the profiles_public view
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

-- Show final counts
SELECT 'Final counts:' as status;
SELECT COUNT(*) as profiles_count FROM profiles;
SELECT COUNT(*) as posts_count FROM posts;
SELECT COUNT(*) as auth_users_count FROM auth.users;
