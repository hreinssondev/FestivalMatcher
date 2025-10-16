import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your Supabase URL and anon key
const supabaseUrl = 'https://gbsndmddgzruzsdiemfb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdic25kbWRkZ3pydXpzZGllbWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDE0NzcsImV4cCI6MjA3MTcxNzQ3N30.6agr3yS-mzFnlVSvk1DpL4AY0ncC1CvR7COab3EO1cM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Test Supabase connection
export async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  console.log('Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...');
  
  try {
    // Test 1: Try to query the users table
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Database connection successful');
    
    // Test 2: Try to list storage buckets
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    
    if (storageError) {
      console.error('❌ Storage connection failed:', storageError);
      return { success: true, storageWorking: false, error: storageError.message };
    }
    
    console.log('✅ Storage connection successful');
    console.log('Available buckets:', buckets?.map(b => b.name).join(', ') || 'none');
    
    const hasProfilePhotos = buckets?.some(b => b.name === 'profile-photos');
    console.log('Has profile-photos bucket:', hasProfilePhotos);
    
    return { 
      success: true, 
      storageWorking: true, 
      hasProfilePhotosBucket: hasProfilePhotos,
      buckets: buckets?.map(b => b.name) || []
    };
  } catch (error: any) {
    console.error('❌ Connection test failed:', error);
    return { success: false, error: error.message };
  }
}

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          age: number;
          gender: string;
          festival: string;
          ticket_type: string;
          accommodation_type: string;
          interests: string[];
          photos: string[];
          location: {
            latitude: number;
            longitude: number;
          } | null;
          last_active: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          age: number;
          gender: string;
          festival: string;
          ticket_type: string;
          accommodation_type: string;
          interests?: string[];
          photos?: string[];
          location?: {
            latitude: number;
            longitude: number;
          } | null;
          last_active?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          age?: number;
          gender?: string;
          festival?: string;
          ticket_type?: string;
          accommodation_type?: string;
          interests?: string[];
          photos?: string[];
          location?: {
            latitude: number;
            longitude: number;
          } | null;
          last_active?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          matched_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          matched_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          matched_at?: string;
          created_at?: string;
        };
      };
      swipes: {
        Row: {
          id: string;
          swiper_id: string;
          swiped_id: string;
          action: 'like' | 'dislike' | 'superlike';
          created_at: string;
        };
        Insert: {
          id?: string;
          swiper_id: string;
          swiped_id: string;
          action: 'like' | 'dislike' | 'superlike';
          created_at?: string;
        };
        Update: {
          id?: string;
          swiper_id?: string;
          swiped_id?: string;
          action?: 'like' | 'dislike' | 'superlike';
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          match_id: string;
          sender_id: string;
          text: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          sender_id: string;
          text: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          sender_id?: string;
          text?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };
    };
  };
} 