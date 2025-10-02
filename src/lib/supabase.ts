import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  user_id: string;
  handle: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  is_active: boolean;
  settings: {
    allow_media: boolean;
    require_moderation: boolean;
    auto_delete_days: number;
  };
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  profile_id: string;
  body: string | null;
  sender_ip_hash: string;
  sender_user_agent: string | null;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderation_notes: string | null;
  is_read: boolean;
  expires_at: string;
  created_at: string;
};

export type MessageMedia = {
  id: string;
  message_id: string;
  media_type: 'image' | 'video';
  file_path: string;
  thumbnail_path: string | null;
  file_size: number;
  mime_type: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  moderation_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export type Report = {
  id: string;
  message_id: string;
  reporter_profile_id: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
};
