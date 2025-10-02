-- Debug Media Issue - Comprehensive Check
-- Copy and paste this SQL into your Supabase SQL Editor

-- 1. Check if media records exist
SELECT 
  'Media Records' as check_type,
  COUNT(*) as count
FROM message_media;

-- 2. Check messages with media
SELECT 
  'Messages with Media' as check_type,
  COUNT(*) as count
FROM messages m
WHERE EXISTS (SELECT 1 FROM message_media mm WHERE mm.message_id = m.id);

-- 3. Show actual media records with message details
SELECT 
  m.id as message_id,
  m.body,
  m.profile_id,
  mm.id as media_id,
  mm.media_type,
  mm.file_path,
  mm.mime_type,
  mm.file_size,
  mm.created_at as media_created
FROM messages m
JOIN message_media mm ON m.id = mm.message_id
ORDER BY mm.created_at DESC
LIMIT 5;

-- 4. Test the exact query the dashboard uses
SELECT 
  m.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', mm.id,
        'message_id', mm.message_id,
        'media_type', mm.media_type,
        'file_path', mm.file_path,
        'thumbnail_path', mm.thumbnail_path,
        'file_size', mm.file_size,
        'mime_type', mm.mime_type,
        'width', mm.width,
        'height', mm.height,
        'duration', mm.duration,
        'moderation_status', mm.moderation_status,
        'created_at', mm.created_at
      )
    ) FILTER (WHERE mm.id IS NOT NULL),
    '[]'::json
  ) as media
FROM messages m
LEFT JOIN message_media mm ON m.id = mm.message_id
GROUP BY m.id
ORDER BY m.created_at DESC
LIMIT 3;

-- 5. Check storage bucket (if using Supabase Storage)
-- Note: This might not work if storage is separate
SELECT 
  'Storage Objects' as check_type,
  COUNT(*) as count
FROM storage.objects 
WHERE bucket_id = 'message-media';

-- 6. Check RLS status
SELECT 
  schemaname, 
  tablename, 
  rowsecurity,
  CASE WHEN rowsecurity THEN 'RLS ENABLED' ELSE 'RLS DISABLED' END as status
FROM pg_tables 
WHERE tablename IN ('messages', 'message_media');
