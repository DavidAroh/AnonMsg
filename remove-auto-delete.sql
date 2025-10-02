-- Remove 4-Hour Auto-Delete Feature
-- This reverts back to the original 30-day message expiration
-- Copy and paste this SQL into your Supabase SQL Editor

-- Remove the cron job for automatic cleanup
SELECT cron.unschedule('cleanup-expired-messages');

-- Remove the trigger for cleanup on insert
DROP TRIGGER IF EXISTS auto_cleanup_trigger ON messages;

-- Remove the trigger function
DROP FUNCTION IF EXISTS trigger_message_cleanup();

-- Revert the default expiration back to 30 days
ALTER TABLE messages 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');

-- Update existing messages to use 30-day expiry (extend their life)
UPDATE messages 
SET expires_at = created_at + interval '30 days'
WHERE expires_at < created_at + interval '30 days';

-- Keep the cleanup function but rename it to the original
DROP FUNCTION IF EXISTS delete_expired_messages_and_media();

-- Restore the original cleanup function (simpler version)
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM messages WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Verify the changes
SELECT 
  'Reverted Settings' as info,
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' AND column_name = 'expires_at';

-- Show that cron job is removed
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-messages') 
    THEN 'Cron job still exists' 
    ELSE 'Cron job removed successfully' 
  END as cron_status;

-- Show updated message expiry times
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
