-- Debug RLS Policies - Run this to check current state
-- Copy and paste this SQL into your Supabase SQL Editor

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'messages', 'message_media', 'reports', 'rate_limits');

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('profiles', 'messages', 'message_media', 'reports', 'rate_limits')
ORDER BY tablename, policyname;

-- Check if anon role exists and has proper permissions
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin
FROM pg_roles 
WHERE rolname IN ('anon', 'authenticated', 'service_role');

-- Test message insertion as anon user (this will show the exact error)
SET ROLE anon;
SELECT current_user;

-- Try to insert a test message (replace with actual profile_id from your database)
-- INSERT INTO messages (profile_id, body, sender_ip_hash) 
-- VALUES ('your-profile-id-here', 'test message', 'test-hash');

-- Reset role
RESET ROLE;
