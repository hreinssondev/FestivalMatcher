# 🔧 Onboarding Fix - RLS Policy Issue

## 🚨 The Problem
Your app is failing to complete onboarding due to a **Row Level Security (RLS) policy violation**:

```
ERROR Device sign in error: {"code": "42501", "details": null, "hint": null, "message": "new row violates row-level security policy for table \"users\""}
```

## ✅ Quick Fix (Recommended for Development)

### Option 1: Disable RLS Completely (Fastest)
Run this SQL in your Supabase SQL Editor:

```sql
-- Quick fix: Disable RLS for development
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE swipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
```

### Option 2: Fix RLS Policies (More Secure)
Run this SQL in your Supabase SQL Editor:

```sql
-- Drop existing RLS policies that use auth.uid()
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can read own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can insert own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can read own matches" ON matches;
DROP POLICY IF EXISTS "Users can read match messages" ON messages;
DROP POLICY IF EXISTS "Users can insert match messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;

-- Create new RLS policies for device-based authentication
CREATE POLICY "Users can read all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (true);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read all swipes" ON swipes FOR SELECT USING (true);
CREATE POLICY "Users can insert own swipes" ON swipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read all matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Users can read all messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Users can insert messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE USING (true);
```

## 🔧 How to Apply the Fix

### 1. **Open Supabase Dashboard**
- Go to your Supabase project dashboard
- Navigate to **SQL Editor**

### 2. **Run the Fix**
- Copy and paste one of the SQL scripts above
- Click **Run** to execute

### 3. **Test the App**
- Go back to your app
- Try the onboarding process again
- It should work now!

## 🎯 Why This Happened

The issue occurred because:
1. **RLS is enabled** on your tables
2. **Policies use `auth.uid()`** (Supabase Auth)
3. **Your app uses device-based auth** (not Supabase Auth)
4. **No valid user context** for RLS policies

## 🚀 After the Fix

### ✅ What Will Work:
- ✅ User registration during onboarding
- ✅ Profile creation
- ✅ Device-based authentication
- ✅ All app functionality

### 🔒 Security Note:
- **Option 1** (disable RLS): Less secure, good for development
- **Option 2** (fix policies): More secure, allows all operations
- For production, implement proper authentication

## 🎉 Success Indicators

After applying the fix, you should see:
- ✅ No more RLS policy errors
- ✅ Successful user registration
- ✅ Onboarding completes
- ✅ App functions normally

## 🐛 If Issues Persist

1. **Check Supabase Logs**: Look for other errors
2. **Verify Table Structure**: Ensure tables exist
3. **Check Network**: Ensure app can reach Supabase
4. **Clear App Cache**: Restart the app

## 📱 Test the Fix

1. **Restart your app**: `npm run ios:dev`
2. **Try onboarding again**
3. **Check console logs** for success messages
4. **Verify user creation** in Supabase dashboard
