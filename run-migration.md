# 🔔 Notifications Setup Instructions

## Step 1: Run Database Migration

1. **Open your Supabase Dashboard**
2. **Go to SQL Editor**
3. **Copy the entire content** from `migrations/create_notifications_table.sql`
4. **Paste and run** the migration

## Step 2: Verify Setup

After running the migration:
1. **Refresh your app**
2. **Check the notification badge** in the navbar
3. **Visit `/notifications`** page
4. **Try liking/commenting** on posts to see real notifications

## What the Migration Creates:

- ✅ `notifications` table with proper structure
- ✅ RLS policies for security
- ✅ Helper functions for creating/getting notifications
- ✅ Indexes for performance
- ✅ Triggers for updated_at timestamps

## Expected Behavior After Migration:

- 🔴 **Red notification badge** appears when you have unread notifications
- 📱 **Notifications page** shows all your notifications
- ⚡ **Real-time updates** when someone likes/comments/follows
- 🎯 **Mention notifications** when someone tags you (@username)

## Troubleshooting:

If notifications still don't work:
1. Check browser console for errors
2. Verify the migration ran successfully in Supabase
3. Make sure you're logged in
4. Try refreshing the page

The notification system is fully built and ready - it just needs the database table! 🚀
