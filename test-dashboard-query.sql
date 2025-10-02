-- Test Dashboard Query - Debug the exact query used
-- Copy and paste this SQL into your Supabase SQL Editor

-- 1. Test the foreign key relationship query (what Dashboard uses)
-- This simulates: .select('*, media:message_media(*)')
SELECT 
  m.*,
  (
    SELECT json_agg(mm.*)
    FROM message_media mm 
    WHERE mm.message_id = m.id
  ) as media
FROM messages m
ORDER BY m.created_at DESC
LIMIT 3;

-- 2. Simple join to see if data exists
SELECT 
  m.id as message_id,
  m.body,
  COUNT(mm.id) as media_count,
  json_agg(
    CASE 
      WHEN mm.id IS NOT NULL THEN
        json_build_object(
          'id', mm.id,
          'media_type', mm.media_type,
          'file_path', mm.file_path,
          'mime_type', mm.mime_type
        )
      ELSE NULL
    END
  ) FILTER (WHERE mm.id IS NOT NULL) as media_details
FROM messages m
LEFT JOIN message_media mm ON m.id = mm.message_id
GROUP BY m.id, m.body, m.created_at
HAVING COUNT(mm.id) > 0
ORDER BY m.created_at DESC;

-- 3. Check if there's a foreign key constraint issue
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('message_media', 'messages');

-- 4. Raw data check - show everything
SELECT 
  'Raw message_media data' as info,
  mm.*
FROM message_media mm
ORDER BY mm.created_at DESC
LIMIT 5;
