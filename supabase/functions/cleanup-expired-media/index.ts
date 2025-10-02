// Supabase Edge Function for automatic media cleanup
// Deploy this to run on a schedule (e.g., every 15 minutes via cron-job.org)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting media cleanup process...')

    // Get expired media files
    const { data: expiredMedia, error: fetchError } = await supabase
      .from('message_media')
      .select('id, file_path, thumbnail_path')
      .lte('expires_at', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching expired media:', fetchError)
      throw fetchError
    }

    console.log(`Found ${expiredMedia?.length || 0} expired media files`)

    let deletedCount = 0
    const errors: string[] = []

    // Process each expired media file
    for (const media of expiredMedia || []) {
      try {
        // Delete main file from storage
        if (media.file_path) {
          const filePath = media.file_path.replace(/^[^/]+\//, '') // Remove bucket prefix
          const { error: deleteFileError } = await supabase.storage
            .from('message-media')
            .remove([filePath])
          
          if (deleteFileError) {
            console.warn(`Failed to delete file ${filePath}:`, deleteFileError)
            errors.push(`File ${filePath}: ${deleteFileError.message}`)
          }
        }

        // Delete thumbnail from storage
        if (media.thumbnail_path) {
          const thumbnailPath = media.thumbnail_path.replace(/^[^/]+\//, '') // Remove bucket prefix
          const { error: deleteThumbnailError } = await supabase.storage
            .from('message-media')
            .remove([thumbnailPath])
          
          if (deleteThumbnailError) {
            console.warn(`Failed to delete thumbnail ${thumbnailPath}:`, deleteThumbnailError)
            errors.push(`Thumbnail ${thumbnailPath}: ${deleteThumbnailError.message}`)
          }
        }

        // Delete database record
        const { error: deleteRecordError } = await supabase
          .from('message_media')
          .delete()
          .eq('id', media.id)

        if (deleteRecordError) {
          console.error(`Failed to delete media record ${media.id}:`, deleteRecordError)
          errors.push(`Record ${media.id}: ${deleteRecordError.message}`)
        } else {
          deletedCount++
          console.log(`Successfully deleted media: ${media.id}`)
        }

      } catch (error) {
        console.error(`Error processing media ${media.id}:`, error)
        errors.push(`Media ${media.id}: ${error.message}`)
      }
    }

    // Also clean up orphaned messages (messages with no media that have expired media)
    const { data: orphanedMessages, error: orphanError } = await supabase
      .from('messages')
      .select('id')
      .not('body', 'is', null)
      .eq('body', null) // Messages with only media, no text
      .not('id', 'in', `(SELECT DISTINCT message_id FROM message_media WHERE expires_at > now())`)

    if (!orphanError && orphanedMessages?.length) {
      const { error: deleteOrphanError } = await supabase
        .from('messages')
        .delete()
        .in('id', orphanedMessages.map(m => m.id))

      if (!deleteOrphanError) {
        console.log(`Deleted ${orphanedMessages.length} orphaned messages`)
      }
    }

    const result = {
      success: true,
      deletedCount,
      totalExpired: expiredMedia?.length || 0,
      errors: errors.length > 0 ? errors : null,
      timestamp: new Date().toISOString()
    }

    console.log('Cleanup completed:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Cleanup function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

/* 
Deployment Instructions:

1. Deploy this function to Supabase:
   supabase functions deploy cleanup-expired-media

2. Set up automatic execution using one of these methods:

   Method A: External Cron Service (Recommended)
   - Use cron-job.org, GitHub Actions, or similar
   - Set up to call: https://your-project.supabase.co/functions/v1/cleanup-expired-media
   - Schedule: Every 15 minutes (*/15 * * * *)
   - Add Authorization header: Bearer YOUR_ANON_KEY

   Method B: GitHub Actions (if using GitHub)
   Create .github/workflows/cleanup-media.yml:
   
   name: Cleanup Expired Media
   on:
     schedule:
       - cron: '*/15 * * * *'  # Every 15 minutes
   jobs:
     cleanup:
       runs-on: ubuntu-latest
       steps:
         - name: Call cleanup function
           run: |
             curl -X POST \
               -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
               https://your-project.supabase.co/functions/v1/cleanup-expired-media

   Method C: Manual trigger
   You can also call this function manually or from your app when needed.
*/
