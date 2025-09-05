-- Ensure all users in auth.users have corresponding profiles
-- This is required for the follow functionality to work properly

-- Check how many users are missing profiles
SELECT 
    'Users missing profiles' as issue,
    COUNT(*) as count
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Show specific missing users
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.raw_user_meta_data
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- Create profiles for all users that don't have them
INSERT INTO profiles (
    id, 
    username, 
    first_name, 
    last_name, 
    email, 
    avatar_url,
    created_at, 
    updated_at
)
SELECT 
    u.id,
    COALESCE(
        u.raw_user_meta_data->>'username',
        u.raw_user_meta_data->>'user_name',
        split_part(u.email, '@', 1),
        'user_' || substr(u.id::text, 1, 8)
    ) as username,
    COALESCE(
        u.raw_user_meta_data->>'first_name',
        u.raw_user_meta_data->>'name',
        split_part(u.email, '@', 1)
    ) as first_name,
    COALESCE(
        u.raw_user_meta_data->>'last_name',
        ''
    ) as last_name,
    u.email,
    u.raw_user_meta_data->>'avatar_url' as avatar_url,
    u.created_at,
    NOW() as updated_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify all users now have profiles
SELECT 
    'Verification' as status,
    CASE 
        WHEN COUNT(*) = 0 THEN 'SUCCESS - All users have profiles'
        ELSE 'FAILURE - ' || COUNT(*) || ' users still missing profiles'
    END as result
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Show profile counts
SELECT 
    'Total profiles' as type,
    COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
    'Total auth users' as type,
    COUNT(*) as count
FROM auth.users;

-- Show sample of created profiles
SELECT 
    id,
    username,
    first_name,
    last_name,
    email,
    created_at
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;
