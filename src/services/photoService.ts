import { supabase } from '../utils/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

export class PhotoService {
  // Test if storage bucket is accessible
  static async testBucketAccess(): Promise<{ success: boolean; error: any }> {
    try {
      console.log('Testing bucket access by trying to list files...');
      
      // Try to list files in the profile-photos bucket (better test than listBuckets)
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .list('', { limit: 1 });
      
      if (error) {
        console.error('Bucket access error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return { success: false, error };
      }
      
      console.log('✅ profile-photos bucket is accessible!');
      console.log('Files found:', data?.length || 0);
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Bucket access test failed:', error);
      return { success: false, error };
    }
  }

  // Upload a photo to Supabase Storage
  static async uploadPhoto(userId: string, photoUri: string, photoIndex: number): Promise<{ url: string; error: any }> {
    try {
      console.log('PhotoService: Starting upload for:', photoUri);
      
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${userId}/photo_${photoIndex}_${timestamp}.jpg`;
      
      console.log('PhotoService: Reading image as base64...');
      // Read the file as base64 using expo-file-system
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: 'base64',
      });
      
      console.log('PhotoService: Converting to ArrayBuffer...');
      // Decode base64 to ArrayBuffer
      const arrayBuffer = decode(base64);
      
      console.log('PhotoService: Uploading to Supabase Storage...');
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .upload(filename, arrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('PhotoService: Upload error:', error);
        console.error('PhotoService: Error details:', JSON.stringify(error, null, 2));
        console.error('PhotoService: Error message:', error.message);
        console.error('PhotoService: Error status:', error.statusCode);
        console.error('PhotoService: Trying to upload to bucket: profile-photos');
        console.error('PhotoService: Filename:', filename);
        return { url: '', error };
      }

      console.log('PhotoService: Upload successful, getting public URL...');
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filename);

      console.log('PhotoService: Public URL:', publicUrl);
      return { url: publicUrl, error: null };
    } catch (error) {
      console.error('PhotoService: Upload failed:', error);
      return { url: '', error };
    }
  }

  // Upload multiple photos
  static async uploadPhotos(userId: string, photoUris: string[]): Promise<{ urls: string[]; error: any }> {
    try {
      
      const uploadPromises = photoUris.map((uri, index) => 
        this.uploadPhoto(userId, uri, index)
      );
      
      const results = await Promise.all(uploadPromises);
      
      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('PhotoService: Some uploads failed:', errors);
        return { urls: [], error: errors[0].error };
      }
      
      const urls = results.map(result => result.url);
      return { urls, error: null };
    } catch (error) {
      console.error('PhotoService: Batch upload failed:', error);
      return { urls: [], error };
    }
  }

  // Delete a photo from Supabase Storage
  static async deletePhoto(photoUrl: string): Promise<{ error: any }> {
    try {
      // Extract filename from URL
      const urlParts = photoUrl.split('/');
      const filename = urlParts.slice(-2).join('/'); // Get userId/filename.jpg
      
      const { error } = await supabase.storage
        .from('profile-photos')
        .remove([filename]);

      if (error) {
        console.error('PhotoService: Delete error:', error);
        return { error };
      }


      return { error: null };
    } catch (error) {
      console.error('PhotoService: Delete failed:', error);
      return { error };
    }
  }

  // Delete multiple photos
  static async deletePhotos(photoUrls: string[]): Promise<{ error: any }> {
    try {
      const filenames = photoUrls.map(url => {
        const urlParts = url.split('/');
        return urlParts.slice(-2).join('/');
      });

      const { error } = await supabase.storage
        .from('profile-photos')
        .remove(filenames);

      if (error) {
        console.error('PhotoService: Batch delete error:', error);
        return { error };
      }


      return { error: null };
    } catch (error) {
      console.error('PhotoService: Batch delete failed:', error);
      return { error };
    }
  }

  // Check if URL is a Supabase Storage URL
  static isSupabaseUrl(url: string): boolean {
    return url.includes('supabase.co') && url.includes('storage');
  }

  // Get photo URL (handles both local URIs and Supabase URLs)
  static getPhotoUrl(url: string): string {
    if (this.isSupabaseUrl(url)) {
      return url;
    } else {
      // For local URIs, return as is
      return url;
    }
  }
}
