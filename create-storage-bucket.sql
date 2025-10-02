-- Create Storage Bucket for Message Media
-- Copy and paste this SQL into your Supabase SQL Editor

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-media',
  'message-media', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
);

-- Create storage policies for the bucket
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

-- Verify bucket creation
SELECT * FROM storage.buckets WHERE id = 'message-media';
