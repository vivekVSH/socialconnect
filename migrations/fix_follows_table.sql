-- Fix follows table to ensure proper status handling and counts
-- This migration ensures the follows table has the right structure for counting

-- Check if follows table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'follows'
) as follows_table_exists;

-- Create follows table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID NOT NULL,
    following_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'accepted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- Add status column if it doesn't exist
ALTER TABLE public.follows ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'accepted';

-- Update existing follows to have 'accepted' status if they don't have one
UPDATE public.follows 
SET status = 'accepted' 
WHERE status IS NULL;

-- Ensure foreign key constraints exist
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;

ALTER TABLE public.follows ADD CONSTRAINT follows_follower_id_fkey 
    FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.follows ADD CONSTRAINT follows_following_id_fkey 
    FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_status ON public.follows(status);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON public.follows(created_at DESC);

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view all follows" ON public.follows;
CREATE POLICY "Users can view all follows" ON public.follows
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own follows" ON public.follows;
CREATE POLICY "Users can insert their own follows" ON public.follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can delete their own follows" ON public.follows;
CREATE POLICY "Users can delete their own follows" ON public.follows
    FOR DELETE USING (auth.uid() = follower_id);

-- Show table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'follows' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show sample data
SELECT 
    follower_id, 
    following_id, 
    status, 
    created_at
FROM public.follows 
ORDER BY created_at DESC 
LIMIT 10;

-- Show counts
SELECT 
    'Total follows' as type,
    COUNT(*) as count
FROM public.follows
UNION ALL
SELECT 
    'Accepted follows' as type,
    COUNT(*) as count
FROM public.follows
WHERE status = 'accepted'
UNION ALL
SELECT 
    'Pending follows' as type,
    COUNT(*) as count
FROM public.follows
WHERE status = 'pending';
