-- Fix ambiguous author_id column reference in database triggers
-- This migration fixes the trigger functions that are causing the ambiguity error

-- Check current trigger functions
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%notify%'
AND routine_schema = 'public';

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS notif_follow_trg ON public.follows;
DROP TRIGGER IF EXISTS notif_like_trg ON public.likes;
DROP TRIGGER IF EXISTS notif_comment_trg ON public.comments;

DROP FUNCTION IF EXISTS public.notify_follow();
DROP FUNCTION IF EXISTS public.notify_like();
DROP FUNCTION IF EXISTS public.notify_comment();

-- Create fixed trigger functions with explicit table references
-- Function for follow notifications
CREATE OR REPLACE FUNCTION public.notify_follow() 
RETURNS trigger AS $$
BEGIN
  -- Use SECURITY DEFINER to bypass RLS
  INSERT INTO notifications(recipient_id, sender_id, notification_type, message)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', 'started following you');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for like notifications - FIXED with explicit table reference
CREATE OR REPLACE FUNCTION public.notify_like() 
RETURNS trigger AS $$
DECLARE 
  post_author_id UUID;
BEGIN
  -- Get the post author with explicit table reference
  SELECT posts.author_id INTO post_author_id 
  FROM posts 
  WHERE posts.id = NEW.post_id;
  
  -- Only notify if it's not the author liking their own post
  IF post_author_id IS NOT NULL AND post_author_id <> NEW.user_id THEN
    -- Use SECURITY DEFINER to bypass RLS
    INSERT INTO notifications(recipient_id, sender_id, notification_type, post_id, message)
    VALUES (post_author_id, NEW.user_id, 'like', NEW.post_id, 'liked your post');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for comment notifications - FIXED with explicit table reference
CREATE OR REPLACE FUNCTION public.notify_comment() 
RETURNS trigger AS $$
DECLARE 
  post_author_id UUID;
BEGIN
  -- Get the post author with explicit table reference
  SELECT posts.author_id INTO post_author_id 
  FROM posts 
  WHERE posts.id = NEW.post_id;
  
  -- Only notify if it's not the author commenting on their own post
  IF post_author_id IS NOT NULL AND post_author_id <> NEW.author_id THEN
    -- Use SECURITY DEFINER to bypass RLS
    INSERT INTO notifications(recipient_id, sender_id, notification_type, post_id, message)
    VALUES (post_author_id, NEW.author_id, 'comment', NEW.post_id, 'commented on your post');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers
CREATE TRIGGER notif_follow_trg
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_follow();

CREATE TRIGGER notif_like_trg
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_like();

CREATE TRIGGER notif_comment_trg
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment();

-- Verify triggers were created
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('follows', 'likes', 'comments')
AND trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Test the functions by showing their definitions
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%notify%'
AND routine_schema = 'public'
ORDER BY routine_name;

-- Show current data counts
SELECT 
    'Posts count' as table_name,
    COUNT(*) as count
FROM public.posts

UNION ALL

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
    'Notifications count' as table_name,
    COUNT(*) as count
FROM public.notifications;
