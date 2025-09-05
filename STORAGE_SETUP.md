# Storage Setup for Image Uploads

## Quick Fix for RLS Policy Error

The "row-level security policy" error occurs because the storage bucket needs proper policies. Here are two solutions:

### Option 1: Use the API Route (Recommended - Already Implemented)

The app now uses a server-side API route (`/api/upload/image`) that bypasses RLS issues. This is already implemented and should work immediately.

### Option 2: Set up Storage Bucket Policies

If you prefer to use direct client uploads, follow these steps:

1. **Go to Supabase Dashboard** → Storage
2. **Create a bucket** named `post-images` (if not exists)
3. **Set it to Public**
4. **Run this SQL in Supabase SQL Editor:**

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'post-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'public'
);

-- Policy to allow anyone to view images
CREATE POLICY "Allow public access to view images" ON storage.objects
FOR SELECT USING (bucket_id = 'post-images');
```

### Current Implementation

The app now uses the API route approach, which:
- ✅ Bypasses RLS policy issues
- ✅ Uses service role for uploads
- ✅ Maintains security through server-side validation
- ✅ Works immediately without additional setup

### Testing

1. Start the dev server: `npm run dev`
2. Go to `http://localhost:3000`
3. Register/Login
4. Try creating a post with an image
5. The upload should now work without RLS errors!
