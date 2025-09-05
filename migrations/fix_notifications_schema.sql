-- Fix notifications table schema to match the expected structure
-- This migration aligns the notifications table with the database triggers

-- Check current notifications table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS post_id UUID;

-- Add foreign key constraints
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_sender_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_post_id_fkey;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_recipient_id_fkey 
    FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_post_id_fkey 
    FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON public.notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_post_id ON public.notifications(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Update existing notifications to use the new schema
-- Map user_id to recipient_id if it exists
UPDATE public.notifications 
SET recipient_id = user_id 
WHERE recipient_id IS NULL AND user_id IS NOT NULL;

-- Map actor_id to sender_id if it exists
UPDATE public.notifications 
SET sender_id = actor_id 
WHERE sender_id IS NULL AND actor_id IS NOT NULL;

-- Map type to notification_type if it exists
UPDATE public.notifications 
SET notification_type = type 
WHERE notification_type IS NULL AND type IS NOT NULL;

-- Show updated table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test the triggers by showing sample data
SELECT 
    id,
    recipient_id,
    sender_id,
    notification_type,
    message,
    post_id,
    created_at
FROM public.notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- Show counts by type
SELECT 
    notification_type,
    COUNT(*) as count
FROM public.notifications 
WHERE notification_type IS NOT NULL
GROUP BY notification_type
ORDER BY count DESC;
