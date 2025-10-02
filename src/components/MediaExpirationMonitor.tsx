import { useState, useEffect } from 'react';
import { Clock, Trash2, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

type MediaExpirationStatus = {
  id: string;
  file_path: string;
  created_at: string;
  expires_at: string;
  status: 'EXPIRED' | 'EXPIRING_SOON' | 'ACTIVE';
  time_remaining: string;
};

type CleanupResult = {
  success: boolean;
  deletedCount: number;
  totalExpired: number;
  errors: string[] | null;
  timestamp: string;
};

export default function MediaExpirationMonitor() {
  const [mediaStatus, setMediaStatus] = useState<MediaExpirationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [lastCleanup, setLastCleanup] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMediaStatus = async () => {
    try {
      setError(null);
      
      // Query message_media table directly since the view might not exist yet
      const { data, error } = await supabase
        .from('message_media')
        .select('id, file_path, created_at, expires_at')
        .order('created_at', { ascending: false });

      if (error) {
        // If expires_at column doesn't exist, try without it
        if (error.message.includes('expires_at')) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('message_media')
            .select('id, file_path, created_at')
            .order('created_at', { ascending: false });
          
          if (fallbackError) throw fallbackError;
          
          // Process without expires_at (assume 1 hour from created_at)
          const processedData = (fallbackData || []).map(media => {
            const now = new Date();
            const createdAt = new Date(media.created_at);
            const expiresAt = new Date(createdAt.getTime() + 60 * 60 * 1000); // 1 hour
            const timeRemaining = expiresAt.getTime() - now.getTime();
            
            let status: 'EXPIRED' | 'EXPIRING_SOON' | 'ACTIVE' = 'ACTIVE';
            if (timeRemaining <= 0) {
              status = 'EXPIRED';
            } else if (timeRemaining <= 10 * 60 * 1000) { // 10 minutes
              status = 'EXPIRING_SOON';
            }
            
            return {
              ...media,
              expires_at: expiresAt.toISOString(),
              status,
              time_remaining: formatDuration(timeRemaining)
            };
          });
          
          setMediaStatus(processedData);
          return;
        }
        throw error;
      }
      
      // Process the data to add status and time_remaining
      const processedData = (data || []).map(media => {
        const now = new Date();
        const expiresAt = new Date(media.expires_at || new Date(media.created_at).getTime() + 60 * 60 * 1000);
        const timeRemaining = expiresAt.getTime() - now.getTime();
        
        let status: 'EXPIRED' | 'EXPIRING_SOON' | 'ACTIVE' = 'ACTIVE';
        if (timeRemaining <= 0) {
          status = 'EXPIRED';
        } else if (timeRemaining <= 10 * 60 * 1000) { // 10 minutes
          status = 'EXPIRING_SOON';
        }
        
        return {
          ...media,
          status,
          time_remaining: formatDuration(timeRemaining)
        };
      });
      
      setMediaStatus(processedData);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching media status:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms <= 0) return '-00:00:00';
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const runManualCleanup = async () => {
    try {
      setCleanupLoading(true);
      setError(null);

      // Try to use the database function first
      let result: CleanupResult;
      
      try {
        const { data, error } = await supabase
          .rpc('cleanup_expired_media_manual');

        if (error) throw error;

        result = {
          success: true,
          deletedCount: data?.[0]?.deleted_count || 0,
          totalExpired: data?.[0]?.deleted_count || 0,
          errors: null,
          timestamp: new Date().toISOString()
        };
      } catch (dbError: any) {
        // If database function doesn't exist, do manual cleanup
        console.log('Database function not available, doing manual cleanup');
        
        // Get expired media
        const { data: expiredMedia, error: fetchError } = await supabase
          .from('message_media')
          .select('id, file_path, thumbnail_path')
          .lt('expires_at', new Date().toISOString());

        if (fetchError) throw fetchError;

        let deletedCount = 0;
        const errors: string[] = [];

        // Delete each expired media file
        for (const media of expiredMedia || []) {
          try {
            // Delete from storage if file_path exists
            if (media.file_path) {
              const { error: storageError } = await supabase.storage
                .from('message-media')
                .remove([media.file_path]);
              
              if (storageError) {
                errors.push(`Storage deletion failed for ${media.file_path}: ${storageError.message}`);
              }
            }

            // Delete database record
            const { error: deleteError } = await supabase
              .from('message_media')
              .delete()
              .eq('id', media.id);

            if (deleteError) {
              errors.push(`Database deletion failed for ${media.id}: ${deleteError.message}`);
            } else {
              deletedCount++;
            }
          } catch (mediaError: any) {
            errors.push(`Error processing media ${media.id}: ${mediaError.message}`);
          }
        }

        result = {
          success: true,
          deletedCount,
          totalExpired: expiredMedia?.length || 0,
          errors: errors.length > 0 ? errors : null,
          timestamp: new Date().toISOString()
        };
      }

      setLastCleanup(result);
      
      // Refresh the media status after cleanup
      await fetchMediaStatus();
      
    } catch (err: any) {
      setError(`Cleanup failed: ${err.message}`);
      console.error('Error running cleanup:', err);
    } finally {
      setCleanupLoading(false);
    }
  };

  useEffect(() => {
    fetchMediaStatus();
    
    // Set up real-time subscription for media changes
    const subscription = supabase
      .channel('media_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'message_media' },
        () => {
          fetchMediaStatus();
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchMediaStatus, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const formatTimeRemaining = (timeRemaining: string) => {
    if (timeRemaining.includes('-')) return 'Expired';
    
    const match = timeRemaining.match(/(\d+):(\d+):(\d+)/);
    if (!match) return timeRemaining;
    
    const [, hours, minutes, seconds] = match;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXPIRED': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'EXPIRING_SOON': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'ACTIVE': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXPIRED': return <AlertTriangle className="w-4 h-4" />;
      case 'EXPIRING_SOON': return <Clock className="w-4 h-4" />;
      case 'ACTIVE': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
          <span className="ml-2 text-slate-400">Loading media status...</span>
        </div>
      </div>
    );
  }

  const expiredCount = mediaStatus.filter(m => m.status === 'EXPIRED').length;
  const expiringSoonCount = mediaStatus.filter(m => m.status === 'EXPIRING_SOON').length;
  const activeCount = mediaStatus.filter(m => m.status === 'ACTIVE').length;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-700 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">
              Media Auto-Delete Monitor
            </h3>
            <p className="text-slate-400 text-sm">
              Media files are automatically deleted after 1 hour
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={fetchMediaStatus}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            {expiredCount > 0 && (
              <button
                onClick={runManualCleanup}
                disabled={cleanupLoading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                <Trash2 className={`w-4 h-4 ${cleanupLoading ? 'animate-pulse' : ''}`} />
                {cleanupLoading ? 'Cleaning...' : `Clean Up (${expiredCount})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 sm:p-6 border-b border-slate-700">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-medium text-sm">Active</span>
            </div>
            <p className="text-2xl font-bold text-white">{activeCount}</p>
          </div>
          
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-medium text-sm">Expiring Soon</span>
            </div>
            <p className="text-2xl font-bold text-white">{expiringSoonCount}</p>
          </div>
          
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 font-medium text-sm">Expired</span>
            </div>
            <p className="text-2xl font-bold text-white">{expiredCount}</p>
          </div>
        </div>
      </div>

      {/* Last Cleanup Result */}
      {lastCleanup && (
        <div className="p-4 sm:p-6 border-b border-slate-700">
          <div className="bg-slate-900 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Last Cleanup Result</h4>
            <div className="text-sm text-slate-300 space-y-1">
              <p>• Deleted: {lastCleanup.deletedCount} files</p>
              <p>• Time: {new Date(lastCleanup.timestamp).toLocaleString()}</p>
              {lastCleanup.errors && (
                <p className="text-red-400">• Errors: {lastCleanup.errors.length}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 sm:p-6 border-b border-slate-700">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Media List */}
      <div className="max-h-96 overflow-y-auto">
        {mediaStatus.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No media files found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {mediaStatus.map((media) => (
              <div key={media.id} className="p-4 sm:p-6 hover:bg-slate-700/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(media.status)}`}>
                        {getStatusIcon(media.status)}
                        {media.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <p className="text-white text-sm font-medium mb-1 truncate">
                      {media.file_path.split('/').pop()}
                    </p>
                    
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>Created: {new Date(media.created_at).toLocaleString()}</p>
                      <p>Expires: {new Date(media.expires_at).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium text-white mb-1">
                      {formatTimeRemaining(media.time_remaining)}
                    </p>
                    <p className="text-xs text-slate-400">remaining</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
