-- Fix notifications foreign key constraints by ensuring all referenced users have profiles
-- This migration handles the case where notifications reference users that don't have profiles

-- First, let's see what's causing the issue
SELECT 
    'Notifications with missing recipient profiles' as issue,
    COUNT(*) as count
FROM notifications n
LEFT JOIN profiles p ON n.recipient_id = p.id
WHERE n.recipient_id IS NOT NULL AND p.id IS NULL

UNION ALL

SELECT 
    'Notifications with missing sender profiles' as issue,
    COUNT(*) as count
FROM notifications n
LEFT JOIN profiles p ON n.sender_id = p.id
WHERE n.sender_id IS NOT NULL AND p.id IS NULL

UNION ALL

SELECT 
    'Total notifications' as issue,
    COUNT(*) as count
FROM notifications;

-- Show specific problematic records
SELECT 
    n.id,
    n.recipient_id,
    n.sender_id,
    n.notification_type,
    n.message,
    CASE WHEN p1.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as recipient_profile_status,
    CASE WHEN p2.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as sender_profile_status
FROM notifications n
LEFT JOIN profiles p1 ON n.recipient_id = p1.id
LEFT JOIN profiles p2 ON n.sender_id = p2.id
WHERE (n.recipient_id IS NOT NULL AND p1.id IS NULL) 
   OR (n.sender_id IS NOT NULL AND p2.id IS NULL)
LIMIT 10;

-- Check if the problematic user IDs exist in auth.users
SELECT 
    'Users in auth.users but not in profiles' as issue,
    COUNT(*) as count
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Show specific missing profiles
SELECT 
    u.id,
    u.email,
    u.created_at as user_created_at,
    p.id as profile_id
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
LIMIT 10;

-- Create missing profiles for users that exist in auth.users but not in profiles
INSERT INTO profiles (id, username, first_name, last_name, email, created_at, updated_at)
SELECT 
    u.id,
    COALESCE(
        split_part(u.email, '@', 1),  -- Use email prefix as username
        'user_' || substr(u.id::text, 1, 8)  -- Fallback to user_id prefix
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
WHERE p.id IS NULL;

-- Update notifications to use valid recipient_id and sender_id
-- First, let's see what we're working with
SELECT 
    'Before cleanup' as status,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN recipient_id IS NOT NULL THEN 1 END) as with_recipient,
    COUNT(CASE WHEN sender_id IS NOT NULL THEN 1 END) as with_sender
FROM notifications;

-- Remove notifications that reference non-existent users
DELETE FROM notifications 
WHERE recipient_id IS NOT NULL 
  AND recipient_id NOT IN (SELECT id FROM profiles);

DELETE FROM notifications 
WHERE sender_id IS NOT NULL 
  AND sender_id NOT IN (SELECT id FROM profiles);

-- Show results after cleanup
SELECT 
    'After cleanup' as status,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN recipient_id IS NOT NULL THEN 1 END) as with_recipient,
    COUNT(CASE WHEN sender_id IS NOT NULL THEN 1 END) as with_sender
FROM notifications;

-- Verify foreign key constraints now work
SELECT 
    'Foreign key check' as test,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS - All foreign keys valid'
        ELSE 'FAIL - ' || COUNT(*) || ' invalid foreign keys'
    END as result
FROM notifications n
LEFT JOIN profiles p1 ON n.recipient_id = p1.id
LEFT JOIN profiles p2 ON n.sender_id = p2.id
WHERE (n.recipient_id IS NOT NULL AND p1.id IS NULL) 
   OR (n.sender_id IS NOT NULL AND p2.id IS NULL);

-- Show final notification counts by type
SELECT 
    notification_type,
    COUNT(*) as count
FROM notifications 
WHERE notification_type IS NOT NULL
GROUP BY notification_type
ORDER BY count DESC;
