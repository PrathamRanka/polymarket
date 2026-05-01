-- Fix RLS policies for users table to allow signup
-- Run this in Supabase SQL Editor if your database was created before the INSERT policy was added

-- Drop old select policy and replace with one that allows all reads
DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_all ON users
  FOR SELECT
  USING (true);

-- Add INSERT policy to allow users to create their own profile during signup
DROP POLICY IF EXISTS users_insert_own ON users;
CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Update policy already exists, no changes needed
-- DROP POLICY IF EXISTS users_update_own ON users;
-- CREATE POLICY users_update_own ON users
--   FOR UPDATE
--   USING (id = auth.uid())
--   WITH CHECK (id = auth.uid());
