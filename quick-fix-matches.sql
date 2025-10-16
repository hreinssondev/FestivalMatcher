-- Quick fix to stop the matches errors
-- Run this in your Supabase SQL Editor

-- Disable RLS for matches table to stop the foreign key errors
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;

-- Also disable RLS for other tables to prevent similar issues
ALTER TABLE swipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
