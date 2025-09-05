-- Clean migration for notifications table
-- This handles existing policies and ensures everything works

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

-- Drop the table if it exists to start fresh
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add status column to follows table if it doesn't exist
ALTER TABLE follows ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'accepted';

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Test the table by inserting a sample notification
-- This will verify everything is working
INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, title, message)
VALUES (
  auth.uid(), 
  auth.uid(), 
  'test', 
  'post', 
  gen_random_uuid(), 
  'Test Notification', 
  'This is a test to verify the notifications table is working!'
);

-- Clean up the test notification
DELETE FROM notifications WHERE type = 'test';
