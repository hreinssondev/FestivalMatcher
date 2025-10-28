-- Migration: Add Instagram column to users table
-- Run this in your Supabase SQL editor if you have an existing database

-- Add Instagram column (nullable, so existing users won't be affected)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS instagram TEXT;

-- You can now use this field in your application
-- The column allows NULL values, so it's optional for users

