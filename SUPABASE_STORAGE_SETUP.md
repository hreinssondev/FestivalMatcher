# Supabase Storage Setup for Photo Uploads

## Overview
To enable photo uploads in the app, you need to configure Supabase Storage. This guide will walk you through setting up the storage bucket and policies.

## Step 1: Create Storage Bucket

1. **Go to your Supabase Dashboard**
   - Navigate to your project at https://supabase.com/dashboard
   - Select your project

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar
   - Click "Create a new bucket"

3. **Configure the Bucket**
   - **Name**: `profile-photos`
   - **Public bucket**: ✅ Check this (so photos can be viewed by other users)
   - **File size limit**: `10 MB` (adjust as needed)
   - **Allowed MIME types**: `image/*` (allows all image types)

4. **Create the Bucket**
   - Click "Create bucket"

## Step 2: Configure Storage Policies

After creating the bucket, you need to set up Row Level Security (RLS) policies.

### Policy 1: Allow Users to Upload Their Own Photos

1. Go to the `profile-photos` bucket
2. Click on "Policies" tab
3. Click "New Policy"
4. Choose "Create a policy from scratch"
5. Configure:
   - **Policy name**: `Users can upload their own photos`
   - **Allowed operation**: `INSERT`
   - **Target roles**: `authenticated` and `anon`
   - **Policy definition**:
   ```sql
   (bucket_id = 'profile-photos'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
   ```

### Policy 2: Allow Users to View All Photos

1. Click "New Policy" again
2. Configure:
   - **Policy name**: `Users can view all photos`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `authenticated` and `anon`
   - **Policy definition**:
   ```sql
   bucket_id = 'profile-photos'::text
   ```

### Policy 3: Allow Users to Delete Their Own Photos

1. Click "New Policy" again
2. Configure:
   - **Policy name**: `Users can delete their own photos`
   - **Allowed operation**: `DELETE`
   - **Target roles**: `authenticated` and `anon`
   - **Policy definition**:
   ```sql
   (bucket_id = 'profile-photos'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
   ```

## Step 3: Test the Setup

Once configured, the app will automatically:
1. Upload photos to `profile-photos/{userId}/photo_{index}_{timestamp}.jpg`
2. Store the public URLs in the database
3. Allow other users to view the photos

## File Structure

Photos will be stored with this structure:
```
profile-photos/
├── user-uuid-1/
│   ├── photo_0_1234567890.jpg
│   ├── photo_1_1234567891.jpg
│   └── photo_2_1234567892.jpg
└── user-uuid-2/
    ├── photo_0_1234567893.jpg
    └── photo_1_1234567894.jpg
```

## Security Notes

- Users can only upload/delete photos in their own folder
- All users can view all photos (needed for the dating app functionality)
- Photos are stored with timestamps to prevent conflicts
- File size and type restrictions are enforced at the bucket level

## Troubleshooting

If you encounter issues:

1. **Check bucket permissions**: Ensure the bucket is public
2. **Verify policies**: Make sure all three policies are active
3. **Check file size**: Ensure photos are under the bucket's file size limit
4. **Check MIME types**: Ensure only image files are being uploaded

## Next Steps

After setting up storage:
1. The app will automatically use Supabase Storage for photo uploads
2. Photos will be accessible via public URLs
3. Users can view each other's photos in the swipe interface
4. Photos persist across devices and app reinstalls
