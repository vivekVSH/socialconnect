-- Fix notifications triggers to work with RLS
-- This migration ensures database triggers can insert notifications

-- Check if triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'follows'
AND trigger_schema = 'public';

-- Check if trigger functions exist
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%notify%'
AND routine_schema = 'public';

-- Drop existing triggers to recreate them
DROP TRIGGER IF EXISTS notif_follow_trg ON public.follows;
DROP TRIGGER IF EXISTS notif_like_trg ON public.likes;
DROP TRIGGER IF EXISTS notif_comment_trg ON public.comments;

-- Drop existing functions to recreate them
DROP FUNCTION IF EXISTS public.notify_follow();
DROP FUNCTION IF EXISTS public.notify_like();
DROP FUNCTION IF EXISTS public.notify_comment();

-- Create new trigger functions that work with RLS
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

-- Function for like notifications
CREATE OR REPLACE FUNCTION public.notify_like() 
RETURNS trigger AS $$
DECLARE 
  author_id UUID;
BEGIN
  -- Get the post author
  SELECT author_id INTO author_id FROM posts WHERE id = NEW.post_id;
  
  -- Only notify if it's not the author liking their own post
  IF author_id IS NOT NULL AND author_id <> NEW.user_id THEN
    -- Use SECURITY DEFINER to bypass RLS
    INSERT INTO notifications(recipient_id, sender_id, notification_type, post_id, message)
    VALUES (author_id, NEW.user_id, 'like', NEW.post_id, 'liked your post');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for comment notifications
CREATE OR REPLACE FUNCTION public.notify_comment() 
RETURNS trigger AS $$
DECLARE 
  author_id UUID;
BEGIN
  -- Get the post author
  SELECT author_id INTO author_id FROM posts WHERE id = NEW.post_id;
  
  -- Only notify if it's not the author commenting on their own post
  IF author_id IS NOT NULL AND author_id <> NEW.author_id THEN
    -- Use SECURITY DEFINER to bypass RLS
    INSERT INTO notifications(recipient_id, sender_id, notification_type, post_id, message)
    VALUES (author_id, NEW.author_id, 'comment', NEW.post_id, 'commented on your post');
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

-- Test the follow trigger by showing function definition
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%notify%'
AND routine_schema = 'public'
ORDER BY routine_name;
