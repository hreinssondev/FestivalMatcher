import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { supabase } from '../utils/supabase';

// Simple UUID generator that works in React Native
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class DeviceAuthService {
  // Get or create device user ID
  static async getDeviceUserId(): Promise<string> {
    try {
      // Try to get existing device user ID
      let deviceUserId = await AsyncStorage.getItem('deviceUserId');
      
      if (!deviceUserId) {
        // Generate a proper UUID for the user ID
        deviceUserId = generateUUID();
        
        // Store device info separately for tracking (optional)
        let deviceInfo = 'unknown';
        if (Platform.OS === 'android') {
          try {
            deviceInfo = Application.getAndroidId() || Application.applicationId || 'android_unknown';
          } catch (error) {
            deviceInfo = Application.applicationId || 'android_unknown';
          }
        } else if (Platform.OS === 'ios') {
          deviceInfo = Application.applicationId || 'ios_unknown';
        }
        
        // Store both the UUID and device info
        await AsyncStorage.setItem('deviceUserId', deviceUserId);
        await AsyncStorage.setItem('deviceInfo', deviceInfo);
      }
      
      return deviceUserId;
    } catch (error) {
      console.error('Error getting device user ID:', error);
      throw error;
    }
  }

  // Sign in with device (creates or gets existing user)
  static async signInWithDevice() {
    try {
      const deviceUserId = await this.getDeviceUserId();
      
      // Check if user exists in Supabase
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', deviceUserId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw fetchError;
      }

      if (existingUser) {
        // User exists, check if it has valid data
        if (existingUser.age < 18 || !existingUser.gender || existingUser.gender === '') {
          // Update the existing user with valid default data
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
              age: 18,
              gender: 'Male',
              last_active: new Date().toISOString(),
            })
            .eq('id', deviceUserId)
            .select()
            .single();

          if (updateError) throw updateError;
          return { user: updatedUser, error: null };
        }
        
        // User exists and has valid data, return it
        return { user: existingUser, error: null };
      } else {
        // Create new user with UUID
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: deviceUserId,
            name: '',
            age: 18, // Set to minimum valid age
            gender: 'Male', // Set to default gender
            festival: '',
            ticket_type: '',
            accommodation_type: '',
            interests: [],
            photos: [],
            last_active: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;
        return { user: newUser, error: null };
      }
    } catch (error) {
      return { user: null, error };
    }
  }

  // Update user profile
  static async updateUserProfile(updates: any) {
    try {
      const deviceUserId = await this.getDeviceUserId();
      
      // First check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', deviceUserId)
        .single();
      
      if (!existingUser) {
        // User doesn't exist, create them first with defaults
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: deviceUserId,
            name: updates.name || '',
            age: updates.age || 18,
            gender: 'Male',
            festival: updates.festival || '',
            ticket_type: updates.ticket_type || '',
            accommodation_type: updates.accommodation_type || '',
            interests: updates.interests || [],
            photos: updates.photos || [],
            last_active: new Date().toISOString(),
          })
          .select()
          .single();
        
        // If duplicate key error (user was just created by another call), just update instead
        if (createError && createError.code === '23505') {
          console.log('User was just created by another call, updating instead...');
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
              ...updates,
              last_active: new Date().toISOString(),
            })
            .eq('id', deviceUserId)
            .select()
            .single();
          
          if (updateError) throw updateError;
          return { profile: updatedUser, error: null };
        }
        
        if (createError) throw createError;
        return { profile: newUser, error: null };
      }
      
      // User exists, update them
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          last_active: new Date().toISOString(),
        })
        .eq('id', deviceUserId)
        .select()
        .single();

      if (error) throw error;
      return { profile: data, error: null };
    } catch (error) {
      return { profile: null, error };
    }
  }

  // Get current user
  static async getCurrentUser() {
    try {
      const deviceUserId = await this.getDeviceUserId();

      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', deviceUserId)
        .single();

      

      if (error) throw error;
      return { user: data, error: null };
    } catch (error) {

      return { user: null, error };
    }
  }

  // Clear device data (for testing/reset)
  static async clearDeviceData() {
    try {
      await AsyncStorage.removeItem('deviceUserId');
      await AsyncStorage.removeItem('deviceInfo');
      await AsyncStorage.removeItem('onboardingCompleted');
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Force recreate user (for fixing constraint issues)
  static async forceRecreateUser() {
    try {
      const deviceUserId = await this.getDeviceUserId();
      
      // Delete existing user if it exists
      await supabase
        .from('users')
        .delete()
        .eq('id', deviceUserId);

      // Create new user with valid data
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: deviceUserId,
          name: '',
          age: 18,
          gender: 'Male',
          festival: '',
          ticket_type: '',
          accommodation_type: '',
          interests: [],
          photos: [],
          last_active: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;
      return { user: newUser, error: null };
    } catch (error) {
      return { user: null, error };
    }
  }
}
