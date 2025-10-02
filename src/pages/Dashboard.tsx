import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MessageCircle,
  Copy,
  Check,
  Trash2,
  Settings,
  LogOut,
  Image as ImageIcon,
  Video,
  AlertTriangle,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile, Message, MessageMedia } from '../lib/supabase';
import { formatTimeAgo } from '../lib/utils';
import MessageModal from '../components/MessageModal';

type MessageWithMedia = Message & {
  media: MessageMedia[];
};

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<MessageWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'media'>('all');
  const [selectedMessage, setSelectedMessage] = useState<MessageWithMedia | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    loadProfile();
  }, [user]);

  useEffect(() => {
    if (profile) {
      loadMessages();
    }
  }, [profile, filter]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        navigate('/setup');
        return;
      }

      setProfile(data);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!profile) return;

    try {
      let query = supabase
        .from('messages')
        .select('*, media:message_media(*)')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (filter === 'unread') {
        query = query.eq('is_read', false);
      } else if (filter === 'media') {
        query = query.not('message_media.id', 'is', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      const messagesWithMedia = (data || []).map((msg: any) => ({
        ...msg,
        media: msg.media || [],
      }));

      setMessages(messagesWithMedia);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const copyLink = () => {
    if (!profile) return;
    const link = `${window.location.origin}/${profile.handle}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);

    setMessages(
      messages.map((msg) =>
        msg.id === messageId ? { ...msg, is_read: true } : msg
      )
    );
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages(messages.filter((msg) => msg.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const openMessageModal = (message: MessageWithMedia) => {
    setSelectedMessage(message);
    setIsModalOpen(true);
    if (!message.is_read) {
      markAsRead(message.id);
    }
  };

  const closeMessageModal = () => {
    setSelectedMessage(null);
    setIsModalOpen(false);
  };

  const getMediaUrl = (filePath: string) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/message-media/${filePath}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const unreadCount = messages.filter((msg) => !msg.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-6xl">
        <header className="flex justify-between items-center mb-6 sm:mb-8">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
            <span className="text-xl sm:text-2xl font-bold text-white">AnonMsg</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/settings"
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8 mb-6 sm:mb-8">
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-4 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold text-white mb-1 truncate">
                    {profile.display_name || `@${profile.handle}`}
                  </h2>
                  <p className="text-slate-400 text-sm sm:text-base">@{profile.handle}</p>
                </div>
                <Link
                  to={`/${profile.handle}`}
                  target="_blank"
                  className="p-2 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 sm:p-4">
                <div className="mb-3 sm:mb-1">
                  <p className="text-slate-400 text-xs sm:text-sm mb-1">Your anonymous link:</p>
                  <p className="text-white font-mono text-xs sm:text-sm break-all">
                    {window.location.origin}/{profile.handle}
                  </p>
                </div>
                <button
                  onClick={copyLink}
                  className="w-full sm:w-auto px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm sm:text-base">Total Messages</span>
                  <span className="text-white font-semibold text-sm sm:text-base">{messages.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm sm:text-base">Unread</span>
                  <span className="text-cyan-400 font-semibold text-sm sm:text-base">{unreadCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm sm:text-base">With Media</span>
                  <span className="text-white font-semibold text-sm sm:text-base">
                    {messages.filter((msg) => msg.media.length > 0).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
          <div className="border-b border-slate-700 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Messages</h2>
              <div className="flex gap-1 sm:gap-2 overflow-x-auto">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    filter === 'all'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    filter === 'unread'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  onClick={() => setFilter('media')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    filter === 'media'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Media
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-700">
            {messages.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-sm sm:text-base">No messages yet</p>
                <p className="text-slate-500 text-xs sm:text-sm mt-2">
                  Share your link to start receiving anonymous messages
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 sm:p-6 transition-colors hover:bg-slate-700/30 cursor-pointer ${
                    !message.is_read ? 'bg-cyan-500/5' : ''
                  }`}
                  onClick={() => openMessageModal(message)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap min-w-0 flex-1">
                      {!message.is_read && (
                        <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0"></div>
                      )}
                      <span className="text-slate-400 text-xs sm:text-sm">
                        {formatTimeAgo(message.created_at)}
                      </span>
                      {message.moderation_status === 'flagged' && (
                        <span className="flex items-center gap-1 text-amber-400 text-xs sm:text-sm">
                          <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Flagged</span>
                        </span>
                      )}
                      {message.media.length > 0 && (
                        <span className="flex items-center gap-1 text-slate-400 text-xs sm:text-sm">
                          {message.media.some(m => m.media_type === 'image') && (
                            <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          )}
                          {message.media.some(m => m.media_type === 'video') && (
                            <Video className="w-3 h-3 sm:w-4 sm:h-4" />
                          )}
                          {message.media.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openMessageModal(message);
                        }}
                        className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
                        title="View message"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMessage(message.id);
                        }}
                        className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                        title="Delete message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {message.body && (
                    <p className="text-white mb-4 whitespace-pre-wrap line-clamp-3 text-sm sm:text-base">
                      {message.body}
                    </p>
                  )}

                  {message.media.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {message.media.slice(0, 3).map((media) => (
                        <div
                          key={media.id}
                          className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700 aspect-square relative"
                        >
                          {media.media_type === 'image' ? (
                            <img
                              src={getMediaUrl(media.file_path)}
                              alt="Message attachment"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                              <Video className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                            </div>
                          )}
                          {message.media.length > 3 && media === message.media[2] && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                +{message.media.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Message Modal */}
      {selectedMessage && (
        <MessageModal
          message={selectedMessage}
          isOpen={isModalOpen}
          onClose={closeMessageModal}
          profileHandle={profile.handle}
        />
      )}
    </div>
  );
}
