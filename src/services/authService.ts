import { supabase } from '../utils/supabase';
import { Database } from '../utils/supabase';

type User = Database['public']['Tables']['users']['Row'];

export class AuthService {
  // Sign up with email and password
  static async signUp(email: string, password: string, userData: Partial<User>) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            name: userData.name || '',
            age: userData.age || 0,
            festival: userData.festival || '',
            ticket_type: userData.ticket_type || '',
            accommodation_type: userData.accommodation_type || '',
            interests: userData.interests || [],
            photos: userData.photos || [],
          });

        if (profileError) throw profileError;
      }

      return { user: authData.user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  }

  // Sign in with email and password
  static async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  }

  // Sign out
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Get current user
  static async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  }

  // Get user profile
  static async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { profile: data, error: null };
    } catch (error) {
      return { profile: null, error };
    }
  }

  // Create or update user profile (for onboarding)
  static async createUserProfile(userData: Partial<User>) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      if (!user) {
        // Create anonymous user if no authenticated user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: `anonymous_${Date.now()}@festivalmatcher.com`,
          password: `password_${Date.now()}`,
        });
        if (signUpError) throw signUpError;
      }

      const currentUser = user || (await supabase.auth.getUser()).data.user;
      if (!currentUser) throw new Error('Failed to get or create user');

      // Insert or update user profile
      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: currentUser.id,
          name: userData.name || '',
          age: userData.age || 0,
          gender: userData.gender || '',
          festival: userData.festival || '',
          ticket_type: userData.ticket_type || '',
          accommodation_type: userData.accommodation_type || '',
          interests: userData.interests || [],
          photos: userData.photos || [],
          last_active: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (error) throw error;
      return { profile: data, error: null };
    } catch (error) {
      return { profile: null, error };
    }
  }

  // Update user profile
  static async updateUserProfile(userId: string, updates: Partial<User>) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { profile: data, error: null };
    } catch (error) {
      return { profile: null, error };
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }
} 