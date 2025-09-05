-- Simple fix for notifications foreign key constraints
-- This migration temporarily disables constraints, cleans data, and re-enables them

-- Step 1: Temporarily disable foreign key constraints
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_sender_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_post_id_fkey;

-- Step 2: Create missing profiles for any users that exist in auth.users but not in profiles
INSERT INTO profiles (id, username, first_name, last_name, email, created_at, updated_at)
SELECT 
    u.id,
    COALESCE(
        u.raw_user_meta_data->>'username',
        split_part(u.email, '@', 1),
        'user_' || substr(u.id::text, 1, 8)
    ) as username,
    COALESCE(
        u.raw_user_meta_data->>'first_name',
        split_part(u.email, '@', 1)
    ) as first_name,
    COALESCE(
        u.raw_user_meta_data->>'last_name',
        ''
    ) as last_name,
    u.email,
    u.created_at,
    NOW() as updated_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 3: Clean up notifications that reference non-existent users
-- Set recipient_id to NULL if the user doesn't exist in profiles
UPDATE notifications 
SET recipient_id = NULL 
WHERE recipient_id IS NOT NULL 
  AND recipient_id NOT IN (SELECT id FROM profiles);

-- Set sender_id to NULL if the user doesn't exist in profiles  
UPDATE notifications 
SET sender_id = NULL 
WHERE sender_id IS NOT NULL 
  AND sender_id NOT IN (SELECT id FROM profiles);

-- Set post_id to NULL if the post doesn't exist
UPDATE notifications 
SET post_id = NULL 
WHERE post_id IS NOT NULL 
  AND post_id NOT IN (SELECT id FROM posts);

-- Step 4: Re-add foreign key constraints
ALTER TABLE public.notifications ADD CONSTRAINT notifications_recipient_id_fkey 
    FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_post_id_fkey 
    FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

-- Step 5: Show final results
SELECT 
    'Final notification counts' as status,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN recipient_id IS NOT NULL THEN 1 END) as with_recipient,
    COUNT(CASE WHEN sender_id IS NOT NULL THEN 1 END) as with_sender,
    COUNT(CASE WHEN post_id IS NOT NULL THEN 1 END) as with_post
FROM notifications;

-- Show notifications by type
SELECT 
    notification_type,
    COUNT(*) as count
FROM notifications 
WHERE notification_type IS NOT NULL
GROUP BY notification_type
ORDER BY count DESC;
