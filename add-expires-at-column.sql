-- Add expires_at column to message_media table for auto-delete feature
-- Run this in your Supabase SQL Editor

-- Step 1: Add expires_at column if it doesn't exist
ALTER TABLE message_media 
ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '1 hour');

-- Step 2: Update existing records to expire in 1 hour from now
UPDATE message_media 
SET expires_at = now() + interval '1 hour' 
WHERE expires_at IS NULL;

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_message_media_expires_at ON message_media(expires_at);

-- Step 4: Create simple cleanup function (optional - for manual cleanup)
CREATE OR REPLACE FUNCTION cleanup_expired_media_simple()
RETURNS TABLE(deleted_count integer, cleanup_time timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    count_deleted integer := 0;
BEGIN
    -- Delete expired media records (files will be cleaned up separately)
    DELETE FROM message_media 
    WHERE expires_at <= now();
    
    GET DIAGNOSTICS count_deleted = ROW_COUNT;
    
    RETURN QUERY SELECT count_deleted, now();
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_media_simple() TO authenticated, anon;

-- Test the setup
SELECT 
    COUNT(*) as total_media,
    COUNT(*) FILTER (WHERE expires_at <= now()) as expired_media,
    COUNT(*) FILTER (WHERE expires_at > now() AND expires_at <= now() + interval '10 minutes') as expiring_soon
FROM message_media;
