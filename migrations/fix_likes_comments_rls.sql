-- Fix RLS policies for likes and comments tables
-- This migration ensures like and comment functionality works properly

-- Check current RLS status for likes table
SELECT 
    'Likes table RLS' as table_name,
    CASE 
        WHEN rowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'likes' 
AND schemaname = 'public';

-- Check current RLS status for comments table
SELECT 
    'Comments table RLS' as table_name,
    CASE 
        WHEN rowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'comments' 
AND schemaname = 'public';

-- Check existing policies for likes table
SELECT 
    'Likes policies' as table_name,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'likes' 
AND schemaname = 'public';

-- Check existing policies for comments table
SELECT 
    'Comments policies' as table_name,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'comments' 
AND schemaname = 'public';

-- Drop existing policies for likes table
DROP POLICY IF EXISTS "Users can view all likes" ON public.likes;
DROP POLICY IF EXISTS "Users can insert their own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can view likes" ON public.likes;
DROP POLICY IF EXISTS "Users can insert likes" ON public.likes;
DROP POLICY IF EXISTS "Users can delete likes" ON public.likes;

-- Drop existing policies for comments table
DROP POLICY IF EXISTS "Users can view all comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete comments" ON public.comments;

-- Create proper RLS policies for likes table
-- Policy 1: Users can view all likes
CREATE POLICY "Users can view all likes" ON public.likes
    FOR SELECT USING (true);

-- Policy 2: Users can insert their own likes
CREATE POLICY "Users can insert their own likes" ON public.likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can delete their own likes
CREATE POLICY "Users can delete their own likes" ON public.likes
    FOR DELETE USING (auth.uid() = user_id);

-- Create proper RLS policies for comments table
-- Policy 1: Users can view all active comments
CREATE POLICY "Users can view all comments" ON public.comments
    FOR SELECT USING (is_active = true);

-- Policy 2: Users can insert their own comments
CREATE POLICY "Users can insert their own comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Policy 3: Users can update their own comments
CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = author_id);

-- Policy 4: Users can delete their own comments (soft delete by setting is_active = false)
CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE USING (auth.uid() = author_id);

-- Ensure RLS is enabled for both tables
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Verify the policies were created
SELECT 
    'Likes policies created' as info,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'likes' 
AND schemaname = 'public'

UNION ALL

SELECT 
    'Comments policies created' as info,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'comments' 
AND schemaname = 'public';

-- Show the created policies
SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename IN ('likes', 'comments')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Test data counts
SELECT 
    'Likes count' as table_name,
    COUNT(*) as count
FROM public.likes

UNION ALL

SELECT 
    'Comments count' as table_name,
    COUNT(*) as count
FROM public.comments

UNION ALL

SELECT 
    'Posts count' as table_name,
    COUNT(*) as count
FROM public.posts;
