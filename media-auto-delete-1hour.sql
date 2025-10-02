-- Media Auto-Delete Feature (1 Hour)
-- This script sets up automatic deletion of media files after 1 hour

-- Step 1: Add expires_at column to message_media table if it doesn't exist
ALTER TABLE message_media 
ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '1 hour');

-- Step 2: Update existing media records to expire in 1 hour from now
UPDATE message_media 
SET expires_at = now() + interval '1 hour' 
WHERE expires_at IS NULL;

-- Step 3: Create function to delete expired media files
CREATE OR REPLACE FUNCTION delete_expired_media()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_media RECORD;
    storage_path text;
BEGIN
    -- Get all expired media files
    FOR expired_media IN 
        SELECT id, file_path, thumbnail_path 
        FROM message_media 
        WHERE expires_at <= now()
    LOOP
        -- Delete main file from storage
        IF expired_media.file_path IS NOT NULL THEN
            storage_path := expired_media.file_path;
            -- Remove the storage bucket prefix if it exists
            storage_path := regexp_replace(storage_path, '^[^/]+/', '');
            
            PERFORM storage.delete_object('message-media', storage_path);
        END IF;
        
        -- Delete thumbnail from storage
        IF expired_media.thumbnail_path IS NOT NULL THEN
            storage_path := expired_media.thumbnail_path;
            -- Remove the storage bucket prefix if it exists
            storage_path := regexp_replace(storage_path, '^[^/]+/', '');
            
            PERFORM storage.delete_object('message-media', storage_path);
        END IF;
        
        -- Delete the database record
        DELETE FROM message_media WHERE id = expired_media.id;
        
        RAISE NOTICE 'Deleted expired media: %', expired_media.id;
    END LOOP;
END;
$$;

-- Step 4: Create a trigger function to set expiration on new media
CREATE OR REPLACE FUNCTION set_media_expiration()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set expiration to 1 hour from creation
    NEW.expires_at := NEW.created_at + interval '1 hour';
    RETURN NEW;
END;
$$;

-- Step 5: Create trigger to automatically set expiration on insert
DROP TRIGGER IF EXISTS set_media_expiration_trigger ON message_media;
CREATE TRIGGER set_media_expiration_trigger
    BEFORE INSERT ON message_media
    FOR EACH ROW
    EXECUTE FUNCTION set_media_expiration();

-- Step 6: Enable pg_cron extension for scheduled cleanup (if available)
-- Note: This requires superuser privileges and may not be available on all hosting providers
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 7: Schedule the cleanup function to run every 15 minutes
-- Note: Uncomment the line below if pg_cron is available
-- SELECT cron.schedule('delete-expired-media', '*/15 * * * *', 'SELECT delete_expired_media();');

-- Step 8: Create a manual cleanup function for hosting providers without pg_cron
CREATE OR REPLACE FUNCTION cleanup_expired_media_manual()
RETURNS TABLE(deleted_count integer, cleanup_time timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    count_deleted integer := 0;
    expired_media RECORD;
    storage_path text;
BEGIN
    -- Count and delete expired media
    FOR expired_media IN 
        SELECT id, file_path, thumbnail_path 
        FROM message_media 
        WHERE expires_at <= now()
    LOOP
        -- Delete main file from storage
        IF expired_media.file_path IS NOT NULL THEN
            storage_path := expired_media.file_path;
            storage_path := regexp_replace(storage_path, '^[^/]+/', '');
            PERFORM storage.delete_object('message-media', storage_path);
        END IF;
        
        -- Delete thumbnail from storage
        IF expired_media.thumbnail_path IS NOT NULL THEN
            storage_path := expired_media.thumbnail_path;
            storage_path := regexp_replace(storage_path, '^[^/]+/', '');
            PERFORM storage.delete_object('message-media', storage_path);
        END IF;
        
        -- Delete the database record
        DELETE FROM message_media WHERE id = expired_media.id;
        count_deleted := count_deleted + 1;
    END LOOP;
    
    RETURN QUERY SELECT count_deleted, now();
END;
$$;

-- Step 9: Grant necessary permissions
GRANT EXECUTE ON FUNCTION delete_expired_media() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_media_manual() TO authenticated;

-- Step 10: Create a view to monitor media expiration
CREATE OR REPLACE VIEW media_expiration_status AS
SELECT 
    id,
    file_path,
    created_at,
    expires_at,
    CASE 
        WHEN expires_at <= now() THEN 'EXPIRED'
        WHEN expires_at <= now() + interval '10 minutes' THEN 'EXPIRING_SOON'
        ELSE 'ACTIVE'
    END as status,
    expires_at - now() as time_remaining
FROM message_media
ORDER BY expires_at ASC;

-- Grant access to the view
GRANT SELECT ON media_expiration_status TO authenticated, anon;

-- Manual cleanup command (run this periodically if pg_cron is not available)
-- SELECT * FROM cleanup_expired_media_manual();

COMMIT;

-- Instructions for manual cleanup:
-- 1. If your hosting provider supports pg_cron, the cleanup will run automatically every 15 minutes
-- 2. If not, you can run this command manually or set up an external cron job:
--    SELECT * FROM cleanup_expired_media_manual();
-- 3. Monitor expiring media with:
--    SELECT * FROM media_expiration_status WHERE status IN ('EXPIRED', 'EXPIRING_SOON');
