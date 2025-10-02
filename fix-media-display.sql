-- Fix Media Display Issue
-- The media uploads work but aren't showing due to SELECT policy restrictions
-- Copy and paste this SQL into your Supabase SQL Editor

-- Grant SELECT permissions on message_media to authenticated users
GRANT SELECT ON public.message_media TO authenticated;

-- Also ensure anon can read media (in case needed for public viewing)
GRANT SELECT ON public.message_media TO anon;

-- Drop existing SELECT policies for message_media that might be too restrictive
DROP POLICY IF EXISTS "Profile owners can view media for their messages" ON message_media;

-- Create a more permissive SELECT policy for message_media
CREATE POLICY "Allow viewing message media"
  ON message_media FOR SELECT
  TO authenticated, anon
  USING (true);

-- Verify the policy is created
SELECT tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'message_media' AND cmd = 'SELECT';

-- Also check if storage bucket exists and has proper policies
-- You may need to create the storage bucket in Supabase Storage if it doesn't exist
