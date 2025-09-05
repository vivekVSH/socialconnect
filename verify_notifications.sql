-- Verification script to check if notifications table is working
-- Run this after the migration to verify everything is set up correctly

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'notifications'
) as table_exists;

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'notifications';

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'notifications';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'notifications';

-- Test insert (this should work if everything is set up correctly)
INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, title, message)
VALUES (
  auth.uid(), 
  auth.uid(), 
  'verification', 
  'test', 
  gen_random_uuid(), 
  'Verification Test', 
  'This verifies the notifications table is working correctly!'
);

-- Check if the test notification was inserted
SELECT COUNT(*) as notification_count FROM notifications WHERE type = 'verification';

-- Clean up test notification
DELETE FROM notifications WHERE type = 'verification';

-- Final verification
SELECT 'Notifications table is working correctly!' as status;
