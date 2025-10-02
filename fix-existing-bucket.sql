-- Fix Existing Storage Bucket Configuration
-- The bucket exists but may have wrong settings or policies
-- Copy and paste this SQL into your Supabase SQL Editor

-- Update the existing bucket to be public and set proper limits
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
WHERE id = 'message-media';

-- Drop existing policies (if any) and recreate them
DROP POLICY IF EXISTS "Anyone can upload message media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view message media" ON storage.objects;
DROP POLICY IF EXISTS "Profile owners can delete their message media" ON storage.objects;

-- Create new storage policies
CREATE POLICY "Anyone can upload message media" ON storage.objects
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (bucket_id = 'message-media');

CREATE POLICY "Anyone can view message media" ON storage.objects
  FOR SELECT 
  TO anon, authenticated
  USING (bucket_id = 'message-media');

CREATE POLICY "Profile owners can delete their message media" ON storage.objects
  FOR DELETE 
  TO authenticated
  USING (bucket_id = 'message-media');

-- Verify the bucket configuration
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'message-media';

-- Check existing files in the bucket
SELECT 
  name,
  bucket_id,
  owner,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
FROM storage.objects 
WHERE bucket_id = 'message-media'
ORDER BY created_at DESC
LIMIT 10;
