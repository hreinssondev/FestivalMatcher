import { supabase } from '../utils/supabase';
import { Database } from '../utils/supabase';
import * as Location from 'expo-location';

type User = Database['public']['Tables']['users']['Row'];

export class LocationService {
  // Update user's current location
  static async updateUserLocation(userId: string, location: Location.LocationObject) {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          last_active: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Get nearby users using PostGIS (requires PostGIS extension in Supabase)
  static async getNearbyUsers(
    userLocation: { latitude: number; longitude: number },
    radiusKm: number = 5,
    limit: number = 20
  ) {
    try {
      // This requires a PostGIS function in Supabase
      // You'll need to create this function in your Supabase SQL editor
      const { data, error } = await supabase.rpc('find_nearby_users', {
        user_lat: userLocation.latitude,
        user_lng: userLocation.longitude,
        radius_km: radiusKm,
        max_users: limit,
      });

      if (error) throw error;
      return { users: data, error: null };
    } catch (error) {
      // Fallback to basic distance calculation if PostGIS function doesn't exist
      return await this.getNearbyUsersFallback(userLocation, radiusKm, limit);
    }
  }

  // Fallback method without PostGIS
  static async getNearbyUsersFallback(
    userLocation: { latitude: number; longitude: number },
    radiusKm: number = 5,
    limit: number = 20
  ) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .not('location', 'is', null);

      if (error) throw error;

      // Calculate distances and filter
      const nearbyUsers = data
        .map(user => ({
          ...user,
          distance: this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            user.location.latitude,
            user.location.longitude
          ),
        }))
        .filter(user => user.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);

      return { users: nearbyUsers, error: null };
    } catch (error) {
      return { users: [], error };
    }
  }

  // Calculate distance between two points using Haversine formula
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Get user's current location
  static async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return location;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  // Watch user's location for real-time updates
  static async watchLocation(
    callback: (location: Location.LocationObject) => void,
    userId: string
  ) {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 100, // Update every 100 meters
        },
        async (location) => {
          // Update location in database
          await this.updateUserLocation(userId, location);
          // Call callback for real-time updates
          callback(location);
        }
      );

      return locationSubscription;
    } catch (error) {
      console.error('Error watching location:', error);
      return null;
    }
  }

  // Get users at the same festival
  static async getUsersAtFestival(festival: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('festival', festival)
        .not('location', 'is', null)
        .limit(limit);

      if (error) throw error;
      return { users: data, error: null };
    } catch (error) {
      return { users: [], error };
    }
  }

  // Format distance for display
  static formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m away`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km away`;
    } else {
      return `${Math.round(distanceKm)}km away`;
    }
  }
} 