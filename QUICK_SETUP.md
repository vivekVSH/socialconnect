# 🚀 Quick Notifications Setup

## Step 1: Run Database Migration

**Copy and paste this SQL into your Supabase SQL Editor:**

```sql
-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
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

-- Create basic RLS policy
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);
```

## Step 2: Test the System

1. **Refresh your app**
2. **Go to `/notifications` page**
3. **Click "🧪 Test Notification" button**
4. **Check the notification badge** - should show red "1"

## Step 3: Test Real Notifications

1. **Like someone's post** → They get a notification
2. **Comment on a post** → They get a notification
3. **Follow someone** → They get a follow request
4. **Mention @username** → They get a notification

## ✅ What You'll See:

- 🔴 **Red notification badge** with count
- 📱 **Two tabs**: Notifications and Requests
- ⚡ **Real-time updates** from feed activity
- 🎯 **Follow requests** with accept/decline

**The notification system will work perfectly after running the migration!** 🎉
