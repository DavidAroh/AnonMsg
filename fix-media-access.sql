-- Fix Media Access for Anonymous Messages
-- This ensures media uploaded by anonymous users can be viewed by profile owners
-- Copy and paste this SQL into your Supabase SQL Editor

-- First, completely disable RLS on message_media table (like we did for messages)
ALTER TABLE message_media DISABLE ROW LEVEL SECURITY;

-- Grant full access to message_media for all roles
GRANT ALL ON public.message_media TO anon;
GRANT ALL ON public.message_media TO authenticated;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'message_media';

-- Check if there are any orphaned media records
SELECT 
  mm.id,
  mm.message_id,
  mm.media_type,
  mm.file_path,
  m.profile_id,
  m.body
FROM message_media mm
LEFT JOIN messages m ON mm.message_id = m.id
ORDER BY mm.created_at DESC
LIMIT 10;

-- This should show rowsecurity = false and list any existing media
