-- SQL script to create a festivals table in Supabase
-- Run this in your Supabase SQL Editor

-- Create festivals table
CREATE TABLE IF NOT EXISTS festivals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  country TEXT,
  genre TEXT, -- e.g., "Electronic", "Rock", "Pop", etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster search
CREATE INDEX IF NOT EXISTS idx_festivals_name ON festivals USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_festivals_location ON festivals(location);

-- Insert some initial popular festivals
INSERT INTO festivals (name, location, country, genre) VALUES
  ('Defqon.1', 'Biddinghuizen', 'Netherlands', 'Electronic'),
  ('Tomorrowland', 'Boom', 'Belgium', 'Electronic'),
  ('Ultra Music Festival', 'Miami', 'USA', 'Electronic'),
  ('Electric Daisy Carnival', 'Las Vegas', 'USA', 'Electronic'),
  ('Coachella', 'Indio', 'USA', 'Mixed'),
  ('Burning Man', 'Black Rock Desert', 'USA', 'Mixed'),
  ('Sziget Festival', 'Budapest', 'Hungary', 'Mixed'),
  ('Lowlands', 'Biddinghuizen', 'Netherlands', 'Mixed'),
  ('Glastonbury', 'Somerset', 'UK', 'Mixed'),
  ('Reading Festival', 'Reading', 'UK', 'Rock'),
  ('Leeds Festival', 'Leeds', 'UK', 'Rock'),
  ('Rock Werchter', 'Werchter', 'Belgium', 'Rock'),
  ('Exit Festival', 'Novi Sad', 'Serbia', 'Electronic'),
  ('Awakenings', 'Amsterdam', 'Netherlands', 'Electronic'),
  ('Mysteryland', 'Haarlemmermeer', 'Netherlands', 'Electronic'),
  ('Parookaville', 'Weeze', 'Germany', 'Electronic'),
  ('Untold', 'Cluj-Napoca', 'Romania', 'Electronic'),
  ('Electric Love', 'Salzburg', 'Austria', 'Electronic'),
  ('Tomorrowland Winter', 'Alpe d\'Huez', 'France', 'Electronic'),
  ('Dekmantel', 'Amsterdam', 'Netherlands', 'Electronic')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security (optional, adjust as needed)
ALTER TABLE festivals ENABLE ROW LEVEL SECURITY;

-- Allow all users to read festivals
CREATE POLICY "Festivals are viewable by everyone" ON festivals
  FOR SELECT USING (true);

