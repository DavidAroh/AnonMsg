import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, Image as ImageIcon, Video, Send, Upload, X, AlertCircle } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';
import { hashString, RateLimiter } from '../lib/utils';

const rateLimiter = new RateLimiter();

export default function PublicProfile() {
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [rateLimitError, setRateLimitError] = useState('');

  useEffect(() => {
    console.log('PublicProfile mounted, handle:', handle);
    if (handle) {
      loadProfile();
    } else {
      console.log('No handle provided');
      setLoading(false);
      setError('No handle provided in URL');
    }
  }, [handle]);

  const loadProfile = async () => {
    try {
      console.log('Loading profile for handle:', handle);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('handle', handle?.toLowerCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Profile data:', data);
      setProfile(data);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    const validFiles = newFiles.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit

      return (isImage || isVideo) && isValidSize;
    });

    setFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() && files.length === 0) {
      setError('Please enter a message or attach media');
      return;
    }

    if (!profile) return;

    // Rate limiting
    const clientId = await hashString(navigator.userAgent + window.location.hostname);
    if (!rateLimiter.check(clientId, 3, 60000)) { // 3 messages per minute
      const remainingTime = Math.ceil(rateLimiter.getRemainingTime(clientId) / 1000);
      setRateLimitError(`Please wait ${remainingTime} seconds before sending another message`);
      return;
    }

    setSending(true);
    setError('');
    setRateLimitError('');

    try {
      const senderIpHash = await hashString(clientId);
      
      // Create message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          profile_id: profile.id,
          body: message.trim() || null,
          sender_ip_hash: senderIpHash,
          sender_user_agent: navigator.userAgent,
          moderation_status: 'approved',
          is_read: false,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Upload files if any
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${messageData.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('message-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create media record
        await supabase.from('message_media').insert({
          message_id: messageData.id,
          media_type: file.type.startsWith('image/') ? 'image' : 'video',
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          moderation_status: 'approved',
        });
      }

      setSuccess(true);
      setMessage('');
      setFiles([]);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-4">Error</h1>
          <p className="text-slate-400 mb-4">{error}</p>
          <p className="text-slate-500 text-sm mb-8">Handle: {handle || 'Not provided'}</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Profile Not Found</h1>
          <p className="text-slate-400 mb-4">This handle doesn't exist or is not active.</p>
          <p className="text-slate-500 text-sm mb-8">Handle: {handle}</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-2xl">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
            <span className="text-xl sm:text-2xl font-bold text-white">AnonMsg</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Send a message to @{profile.handle}
          </h1>
          {profile.display_name && (
            <p className="text-slate-400 text-base sm:text-lg">{profile.display_name}</p>
          )}
          {profile.bio && (
            <p className="text-slate-300 mt-4 max-w-md mx-auto text-sm sm:text-base">{profile.bio}</p>
          )}
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-4 sm:p-8">
          {success ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Message Sent!</h3>
              <p className="text-slate-300">
                Your anonymous message has been delivered successfully.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-slate-300 mb-3 text-sm font-medium">
                  Send an anonymous message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors resize-none"
                  placeholder="Type your message here..."
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-slate-500 text-xs mt-2">{message.length}/1000</p>
              </div>

              {profile.settings?.allow_media !== false && (
                <div>
                  <label className="block text-slate-300 mb-3 text-sm font-medium">
                    Attach media (optional)
                  </label>
                  <div className="space-y-3">
                    {files.length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="relative bg-slate-900 border border-slate-700 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                {file.type.startsWith('image/') ? (
                                  <ImageIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                ) : (
                                  <Video className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                )}
                                <span className="text-white text-sm truncate">{file.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="text-slate-400 hover:text-red-400 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {files.length < 5 && (
                      <label className="block">
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-slate-500 transition-colors cursor-pointer">
                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-slate-400 text-sm">
                            Click to upload images or videos
                          </p>
                          <p className="text-slate-500 text-xs mt-1">
                            Max 5 files, 10MB each
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {rateLimitError && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 rounded-lg text-sm">
                  {rateLimitError}
                </div>
              )}

              <button
                type="submit"
                disabled={sending || (!message.trim() && files.length === 0)}
                className="w-full px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>

              <p className="text-slate-500 text-xs text-center">
                Your message is completely anonymous. The recipient won't know who sent it.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
