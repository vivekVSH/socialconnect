-- Fix Row Level Security policies for notifications table
-- This migration ensures RLS policies allow proper notification creation

-- Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'notifications' 
AND schemaname = 'public';

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications' 
AND schemaname = 'public';

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete notifications" ON public.notifications;

-- Create proper RLS policies for notifications
-- Policy 1: Users can view notifications where they are the recipient
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = recipient_id);

-- Policy 2: Users can view notifications where they are the sender (for debugging)
CREATE POLICY "Users can view notifications they sent" ON public.notifications
    FOR SELECT USING (auth.uid() = sender_id);

-- Policy 3: Allow system to insert notifications (for triggers and API)
CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Policy 4: Users can update their own notifications (mark as read, etc.)
CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- Policy 5: Users can delete their own notifications
CREATE POLICY "Users can delete their notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = recipient_id);

-- Ensure RLS is enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Test the policies by showing what they look like
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications' 
AND schemaname = 'public'
ORDER BY policyname;

-- Show RLS status
SELECT 
    'RLS Status' as info,
    CASE 
        WHEN rowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END as status
FROM pg_tables 
WHERE tablename = 'notifications' 
AND schemaname = 'public';

-- Test notification creation (this should work now)
SELECT 
    'Policy test' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'notifications' 
            AND policyname = 'System can insert notifications'
        ) THEN 'PASS - Insert policy exists'
        ELSE 'FAIL - Insert policy missing'
    END as result;
