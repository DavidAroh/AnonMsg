-- Anonymous Messaging Platform - Policy Update Script
-- This script safely updates existing policies to fix anonymous user access
-- Copy and paste this SQL into your Supabase SQL Editor

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Anyone can view active profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

DROP POLICY IF EXISTS "Anyone can create messages" ON messages;
DROP POLICY IF EXISTS "Profile owners can view their messages" ON messages;
DROP POLICY IF EXISTS "Profile owners can update their messages" ON messages;
DROP POLICY IF EXISTS "Profile owners can delete their messages" ON messages;

DROP POLICY IF EXISTS "Anyone can create message media" ON message_media;
DROP POLICY IF EXISTS "Profile owners can view media for their messages" ON message_media;
DROP POLICY IF EXISTS "Profile owners can delete media for their messages" ON message_media;

DROP POLICY IF EXISTS "Profile owners can create reports for their messages" ON reports;
DROP POLICY IF EXISTS "Profile owners can view their reports" ON reports;
DROP POLICY IF EXISTS "Profile owners can create reports" ON reports;

-- Recreate policies with correct permissions

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
