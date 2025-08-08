import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your Supabase URL and anon key
const supabaseUrl = 'https://xakjrxqmgcqnzybxaaaf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhha2pyeHFtZ2Nxbnp5YnhhYWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NzkwNDAsImV4cCI6MjA3MDE1NTA0MH0.yNl_TpTRu-ObFpr-LrHyY_MpjH1TlkpqtPlj2h2UELY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          age: number;
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