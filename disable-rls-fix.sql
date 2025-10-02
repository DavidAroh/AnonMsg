-- Emergency Fix: Disable RLS on messages table
-- This will allow anonymous users to send messages immediately
-- Copy and paste this SQL into your Supabase SQL Editor

-- Completely disable RLS on messages table (temporary fix)
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_media DISABLE ROW LEVEL SECURITY;

-- Grant all necessary permissions to anon role
GRANT ALL ON public.messages TO anon;
GRANT ALL ON public.message_media TO anon;
GRANT SELECT ON public.profiles TO anon;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('messages', 'message_media');

-- This should show rowsecurity = false for both tables
