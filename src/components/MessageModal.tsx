import { useState } from 'react';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  Calendar,
  Image as ImageIcon,
  Video,
  AlertTriangle,
} from 'lucide-react';
import { MessageMedia } from '../lib/supabase';
import { formatTimeAgo } from '../lib/utils';

type Message = {
  id: string;
  body: string | null;
  created_at: string;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  media: MessageMedia[];
};

interface MessageModalProps {
  message: Message;
  isOpen: boolean;
  onClose: () => void;
  profileHandle: string;
}

export default function MessageModal({ message, isOpen, onClose, profileHandle }: MessageModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareText, setShareText] = useState('');

  if (!isOpen) return null;

  const getMediaUrl = (filePath: string) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/message-media/${filePath}`;
  };

  const downloadMedia = async (media: MessageMedia) => {
    try {
      const response = await fetch(getMediaUrl(media.file_path));
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `message-${media.media_type}-${Date.now()}.${media.mime_type.split('/')[1]}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading media:', error);
    }
  };

  const shareMessage = async () => {
    const shareUrl = `${window.location.origin}/${profileHandle}`;
    const text = `Check out this anonymous message platform: ${shareUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Anonymous Message',
          text: text,
          url: shareUrl,
        });
      } catch (error) {
        // Fallback to copy
        copyShareText(text);
      }
    } else {
      copyShareText(text);
    }
  };

  const copyShareText = (text: string) => {
    navigator.clipboard.writeText(text);
    setShareText(text);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShareText('');
    }, 3000);
  };

  const copyMessage = () => {
    const text = message.body || 'Message with media attachment';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-700">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">{formatTimeAgo(message.created_at)}</span>
            </div>
            {message.moderation_status === 'flagged' && (
              <span className="flex items-center gap-1 text-amber-400 text-xs sm:text-sm bg-amber-400/10 px-2 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                <span className="hidden sm:inline">Flagged</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
          {message.body && (
            <div className="mb-4 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-medium text-slate-400 mb-2">Message</h3>
              <div className="bg-slate-900 rounded-lg p-3 sm:p-4 border border-slate-700">
                <p className="text-white whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                  {message.body}
                </p>
              </div>
            </div>
          )}

          {message.media.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-medium text-slate-400 mb-3">
                Media Attachments ({message.media.length})
              </h3>
              <div className="grid gap-4">
                {message.media.map((media) => (
                  <div
                    key={media.id}
                    className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700"
                  >
                    <div className="relative group">
                      {media.media_type === 'image' ? (
                        <img
                          src={getMediaUrl(media.file_path)}
                          alt="Message attachment"
                          className="w-full max-h-96 object-contain bg-slate-800"
                        />
                      ) : (
                        <video
                          src={getMediaUrl(media.file_path)}
                          controls
                          className="w-full max-h-96 object-contain bg-slate-800"
                        />
                      )}
                      
                      {/* Download overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => downloadMedia(media)}
                          className="bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition-colors"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Media info */}
                    <div className="p-2 sm:p-3 flex items-center justify-between">
                      <div className="flex items-center gap-1 sm:gap-2 text-slate-400 text-xs sm:text-sm min-w-0 flex-1">
                        {media.media_type === 'image' ? (
                          <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        ) : (
                          <Video className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        )}
                        <span className="truncate">{media.mime_type}</span>
                        {media.width && media.height && (
                          <span className="hidden sm:inline">• {media.width}×{media.height}</span>
                        )}
                        <span>• {(media.file_size / 1024 / 1024).toFixed(1)}MB</span>
                      </div>
                      <button
                        onClick={() => downloadMedia(media)}
                        className="text-slate-400 hover:text-white transition-colors p-1 flex-shrink-0"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-slate-700 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {message.body && (
                <button
                  onClick={copyMessage}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Text
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={shareMessage}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm"
              >
                <Share2 className="w-4 h-4" />
                Share Platform
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm sm:text-base"
            >
              Close
            </button>
          </div>

          {/* Share feedback */}
          {shareText && (
            <div className="mt-4 p-3 bg-slate-900 rounded-lg border border-slate-700">
              <p className="text-slate-400 text-xs sm:text-sm mb-2">Link copied to clipboard:</p>
              <p className="text-white text-xs sm:text-sm font-mono break-all">{shareText}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
