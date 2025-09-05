-- IMMEDIATE FIX for notifications table
-- This will definitely fix the recipient_id column issue

-- Step 1: Check current notifications table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Add the missing columns if they don't exist
DO $$ 
BEGIN
    -- Add recipient_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'recipient_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN recipient_id UUID;
        RAISE NOTICE 'Added recipient_id column';
    ELSE
        RAISE NOTICE 'recipient_id column already exists';
    END IF;

    -- Add sender_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'sender_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN sender_id UUID;
        RAISE NOTICE 'Added sender_id column';
    ELSE
        RAISE NOTICE 'sender_id column already exists';
    END IF;

    -- Add notification_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'notification_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN notification_type VARCHAR(50);
        RAISE NOTICE 'Added notification_type column';
    ELSE
        RAISE NOTICE 'notification_type column already exists';
    END IF;

    -- Add post_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'post_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN post_id UUID;
        RAISE NOTICE 'Added post_id column';
    ELSE
        RAISE NOTICE 'post_id column already exists';
    END IF;
END $$;

-- Step 3: Show updated table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 4: Test that the columns exist
SELECT 
    'Column check' as test,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') 
        THEN 'PASS - recipient_id exists'
        ELSE 'FAIL - recipient_id missing'
    END as recipient_id_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'sender_id') 
        THEN 'PASS - sender_id exists'
        ELSE 'FAIL - sender_id missing'
    END as sender_id_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'notification_type') 
        THEN 'PASS - notification_type exists'
        ELSE 'FAIL - notification_type missing'
    END as notification_type_status;

-- Step 5: Show current notification data
SELECT 
    'Current notifications' as info,
    COUNT(*) as total_count
FROM notifications;
