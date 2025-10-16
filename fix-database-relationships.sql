-- Fix database relationships for Supabase
-- Run this in your Supabase SQL Editor

-- Drop existing foreign key constraints if they exist
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_user1_id_fkey;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_user2_id_fkey;
ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_swiper_id_fkey;
ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_swiped_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_match_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Add foreign key constraints with explicit names
ALTER TABLE matches 
ADD CONSTRAINT matches_user1_id_fkey 
FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE matches 
ADD CONSTRAINT matches_user2_id_fkey 
FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE swipes 
ADD CONSTRAINT swipes_swiper_id_fkey 
FOREIGN KEY (swiper_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE swipes 
ADD CONSTRAINT swipes_swiped_id_fkey 
FOREIGN KEY (swiped_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE messages 
ADD CONSTRAINT messages_match_id_fkey 
FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

ALTER TABLE messages 
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create the specific foreign key relationship that Supabase is looking for
-- This is what's causing the PGRST200 error
ALTER TABLE matches 
ADD CONSTRAINT users_matches_user1_id_fkey 
FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE matches 
ADD CONSTRAINT users_matches_user2_id_fkey 
FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE;

-- Verify the constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('matches', 'swipes', 'messages')
ORDER BY tc.table_name, tc.constraint_name;
