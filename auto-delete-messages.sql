-- Auto-Delete Messages After 4 Hours
-- This sets up automatic deletion of messages and their media after 4 hours
-- Copy and paste this SQL into your Supabase SQL Editor

-- First, update existing messages to expire in 4 hours from now (if you want to apply to existing messages)
UPDATE messages 
SET expires_at = created_at + interval '4 hours'
WHERE expires_at > now() + interval '4 hours'; -- Only update messages that would expire later than 4 hours

-- Update the default expiration for new messages to 4 hours
ALTER TABLE messages 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '4 hours');

-- Create an improved cleanup function that also handles media files
CREATE OR REPLACE FUNCTION delete_expired_messages_and_media()
RETURNS void AS $$
BEGIN
  -- Delete media files first (to maintain referential integrity)
  DELETE FROM message_media 
  WHERE message_id IN (
    SELECT id FROM messages WHERE expires_at < now()
  );
  
  -- Then delete the expired messages
  DELETE FROM messages WHERE expires_at < now();
  
  -- Log the cleanup (optional)
  RAISE NOTICE 'Cleaned up expired messages and media at %', now();
END;
$$ LANGUAGE plpgsql;

-- Enable the pg_cron extension (if not already enabled)
-- Note: This might require superuser privileges
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup function to run every 30 minutes
-- This ensures messages are deleted shortly after they expire
SELECT cron.schedule(
  'cleanup-expired-messages',
  '*/30 * * * *', -- Every 30 minutes
  'SELECT delete_expired_messages_and_media();'
);

-- Alternative: Manual trigger approach (if pg_cron is not available)
-- You can call this function manually or from your application
CREATE OR REPLACE FUNCTION trigger_message_cleanup()
RETURNS trigger AS $$
BEGIN
  -- Clean up expired messages whenever a new message is inserted
  -- This spreads the cleanup load across user interactions
  PERFORM delete_expired_messages_and_media();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run cleanup on new message insertion (optional)
DROP TRIGGER IF EXISTS auto_cleanup_trigger ON messages;
CREATE TRIGGER auto_cleanup_trigger
  AFTER INSERT ON messages
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_message_cleanup();

-- Verify the setup
SELECT 
  'Current Settings' as info,
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' AND column_name = 'expires_at';

-- Show scheduled cron jobs (if pg_cron is enabled)
SELECT 
  jobname,
  schedule,
  command,
  active
FROM cron.job 
WHERE jobname = 'cleanup-expired-messages';

-- Test the cleanup function manually
SELECT delete_expired_messages_and_media();

-- Show messages that will expire soon
SELECT 
  id,
  body,
  created_at,
  expires_at,
  expires_at - now() as time_until_expiry
FROM messages 
WHERE expires_at > now()
ORDER BY expires_at ASC
LIMIT 5;
