-- Make a specific user an admin
-- Replace 'your-email@example.com' with your actual email address

-- Method 1: Update existing user to admin
UPDATE profiles 
SET is_admin = true 
WHERE email = 'your-email@example.com';

-- Method 2: If you know your user ID, you can use that instead
-- UPDATE profiles 
-- SET is_admin = true 
-- WHERE id = 'your-user-id-here';

-- Method 3: Make the first user an admin (if you're the first user)
-- UPDATE profiles 
-- SET is_admin = true 
-- ORDER BY created_at ASC 
-- LIMIT 1;

-- Verify the update
SELECT id, email, username, first_name, last_name, is_admin, created_at 
FROM profiles 
WHERE is_admin = true;
