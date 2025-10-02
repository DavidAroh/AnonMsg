-- Fix Anonymous User Permissions - Complete Solution
-- Copy and paste this SQL into your Supabase SQL Editor

-- First, ensure anon role has basic permissions on tables
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON public.messages TO anon;
GRANT INSERT ON public.message_media TO anon;
GRANT SELECT ON public.profiles TO anon;

-- Drop and recreate the problematic policies with explicit permissions
DROP POLICY IF EXISTS "Anyone can create messages" ON messages;
DROP POLICY IF EXISTS "Anyone can create message media" ON message_media;

-- Create new policies that explicitly allow anon role
CREATE POLICY "Allow anonymous message creation"
  ON messages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated message creation"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anonymous media upload"
  ON message_media FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated media upload"
  ON message_media FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Verify the policies are created
SELECT tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('messages', 'message_media') 
AND policyname LIKE '%anonymous%' OR policyname LIKE '%authenticated%';
