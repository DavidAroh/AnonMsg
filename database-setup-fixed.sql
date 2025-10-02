-- Anonymous Messaging Platform - Database Setup
-- Copy and paste this SQL into your Supabase SQL Editor
-- Go to: Project Settings > SQL Editor > New Query

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  handle text UNIQUE NOT NULL,
  display_name text DEFAULT '',
  bio text DEFAULT '',
  avatar_url text,
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{"allow_media": true, "require_moderation": true, "auto_delete_days": 30}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT handle_format CHECK (handle ~* '^[a-z0-9_]{3,30}$')
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  body text,
  sender_ip_hash text NOT NULL,
  sender_user_agent text,
  moderation_status text DEFAULT 'pending',
  moderation_notes text,
  is_read boolean DEFAULT false,
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT moderation_status_check CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
  CONSTRAINT message_content_check CHECK (body IS NOT NULL OR EXISTS (SELECT 1 FROM message_media WHERE message_id = id))
);

-- Create message_media table
CREATE TABLE IF NOT EXISTS message_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  media_type text NOT NULL,
  file_path text NOT NULL,
  thumbnail_path text,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  width integer,
  height integer,
  duration integer,
  moderation_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT media_type_check CHECK (media_type IN ('image', 'video')),
  CONSTRAINT file_size_check CHECK (file_size > 0 AND file_size <= 52428800)
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  reporter_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT status_check CHECK (status IN ('pending', 'reviewed', 'resolved'))
);

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  action_type text NOT NULL,
  count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON profiles(handle);
CREATE INDEX IF NOT EXISTS idx_messages_profile_id ON messages(profile_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_moderation_status ON messages(moderation_status);
CREATE INDEX IF NOT EXISTS idx_message_media_message_id ON message_media(message_id);
CREATE INDEX IF NOT EXISTS idx_reports_message_id ON reports(message_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_hash ON rate_limits(ip_hash, action_type, window_start);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Anyone can view active profiles"
  ON profiles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can create their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Messages RLS Policies (FIXED: Now allows anonymous users)
CREATE POLICY "Anyone can create messages"
  ON messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Profile owners can view their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Profile owners can update their messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Profile owners can delete their messages"
  ON messages FOR DELETE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Message Media RLS Policies (FIXED: Now allows anonymous users)
CREATE POLICY "Anyone can create message media"
  ON message_media FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Profile owners can view media for their messages"
  ON message_media FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN profiles p ON m.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Profile owners can delete media for their messages"
  ON message_media FOR DELETE
  TO authenticated
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN profiles p ON m.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Reports RLS Policies
CREATE POLICY "Profile owners can create reports for their messages"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Profile owners can view their reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    reporter_profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Rate Limits: No direct user access (managed server-side via service role)

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired messages
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM messages WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;
