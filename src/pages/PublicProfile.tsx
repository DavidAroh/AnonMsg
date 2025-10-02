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
      const isValidSize = file.size <= (isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024);
      return (isImage || isVideo) && isValidSize;
    });

    if (validFiles.length + files.length > 4) {
      setError('You can upload up to 4 files per message');
      return;
    }

    setFiles([...files, ...validFiles]);
    setError('');
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || (!message.trim() && files.length === 0)) return;

    const ipHash = await hashString('demo-ip');

    if (!rateLimiter.check(ipHash, 5, 60000)) {
      const remainingMs = rateLimiter.getRemainingTime(ipHash);
      const remainingSec = Math.ceil(remainingMs / 1000);
      setRateLimitError(`Too many messages. Please wait ${remainingSec} seconds.`);
      setTimeout(() => setRateLimitError(''), remainingMs);
      return;
    }

    setError('');
    setRateLimitError('');
    setSending(true);

    try {
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          profile_id: profile.id,
          body: message.trim() || null,
          sender_ip_hash: ipHash,
          sender_user_agent: navigator.userAgent,
          moderation_status: 'approved',
        })
        .select()
        .single();

      if (messageError) throw messageError;

      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${messageData.id}-${Date.now()}.${fileExt}`;
          const filePath = `${profile.handle}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('message-media')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          await supabase.from('message_media').insert({
            message_id: messageData.id,
            media_type: file.type.startsWith('image/') ? 'image' : 'video',
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            moderation_status: 'approved',
          });
        }
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
    </div>
  );
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Send a message to @{profile!.handle}
          </h1>
          {profile!.display_name && (
            <p className="text-slate-400 text-base sm:text-lg">{profile!.display_name}</p>
          )}
          {profile!.bio && (
            <p className="text-slate-300 mt-4 max-w-md mx-auto text-sm sm:text-base">{profile!.bio}</p>
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

                {profile!.settings?.allow_media !== false && (
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
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <div className="flex items-center gap-3">
                                {file.type.startsWith('image/') ? (
                                  <ImageIcon className="w-8 h-8 text-emerald-400" />
                                ) : (
                                  <Video className="w-8 h-8 text-rose-400" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm truncate">{file.name}</p>
                                  <p className="text-slate-500 text-xs">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {files.length < 4 && (
                        <label className="block cursor-pointer">
                          <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 hover:border-cyan-400 transition-colors">
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="w-8 h-8 text-slate-400" />
                              <p className="text-slate-400 text-sm">
                                Click to upload images or videos
                              </p>
                              <p className="text-slate-500 text-xs">
                                Images up to 10MB, Videos up to 50MB
                              </p>
                            </div>
                          </div>
                          <input
                            type="file"
                            onChange={handleFileChange}
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {rateLimitError && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {rateLimitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sending || (!message.trim() && files.length === 0)}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sending ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Anonymously
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
}}
