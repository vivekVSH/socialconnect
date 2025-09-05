-- Fix notifications table to add missing recipient_id column
-- This migration adds the recipient_id column that's needed for follow notifications

-- Check if notifications table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
) as notifications_table_exists;

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

-- Add recipient_id column if it doesn't exist
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_id UUID;

-- Add foreign key constraint for recipient_id
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_recipient_id_fkey 
    FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create index for recipient_id for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);

-- Update existing notifications to have recipient_id if they don't have one
-- This assumes existing notifications have a user_id field that should be recipient_id
UPDATE public.notifications 
SET recipient_id = user_id 
WHERE recipient_id IS NULL AND user_id IS NOT NULL;

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

-- Show sample notifications data
SELECT 
    id,
    user_id,
    recipient_id,
    type,
    message,
    created_at
FROM public.notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- Show counts
SELECT 
    'Total notifications' as type,
    COUNT(*) as count
FROM public.notifications
UNION ALL
SELECT 
    'Notifications with recipient_id' as type,
    COUNT(*) as count
FROM public.notifications
WHERE recipient_id IS NOT NULL
UNION ALL
SELECT 
    'Notifications without recipient_id' as type,
    COUNT(*) as count
FROM public.notifications
WHERE recipient_id IS NULL;
