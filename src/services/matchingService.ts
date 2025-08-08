import { supabase } from '../utils/supabase';
import { Database } from '../utils/supabase';
import { LocationService } from './locationService';

type User = Database['public']['Tables']['users']['Row'];
type Swipe = Database['public']['Tables']['swipes']['Row'];
type Match = Database['public']['Tables']['matches']['Row'];

export class MatchingService {
  // Record a swipe action
  static async recordSwipe(
    swiperId: string,
    swipedId: string,
    action: 'like' | 'dislike' | 'superlike'
  ) {
    try {
      const { data, error } = await supabase
        .from('swipes')
        .insert({
          swiper_id: swiperId,
          swiped_id: swipedId,
          action: action,
        })
        .select()
        .single();

      if (error) throw error;
      return { swipe: data, error: null };
    } catch (error) {
      return { swipe: null, error };
    }
  }

  // Get potential matches for a user
  static async getPotentialMatches(
    userId: string,
    userLocation: { latitude: number; longitude: number },
    limit: number = 20
  ) {
    try {
      // Get users the current user hasn't swiped on yet
      const { data: swipedUsers, error: swipedError } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', userId);

      if (swipedError) throw swipedError;

      const swipedIds = swipedUsers.map(swipe => swipe.swiped_id);

      // Get nearby users excluding already swiped users
      const { users, error } = await LocationService.getNearbyUsers(
        userLocation,
        10, // 10km radius
        limit * 2 // Get more to filter
      );

      if (error) throw error;

      // Filter out already swiped users and the user themselves
      const potentialMatches = users.filter(
        user => !swipedIds.includes(user.id) && user.id !== userId
      );

      return { 
        users: potentialMatches.slice(0, limit), 
        error: null 
      };
    } catch (error) {
      return { users: [], error };
    }
  }

  // Get user's matches
  static async getUserMatches(userId: string) {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          matched_at,
          user1_id,
          user2_id,
          users!matches_user1_id_fkey (
            id,
            name,
            age,
            festival,
            ticket_type,
            accommodation_type,
            interests,
            photos,
            last_active
          ),
          users!matches_user2_id_fkey (
            id,
            name,
            age,
            festival,
            ticket_type,
            accommodation_type,
            interests,
            photos,
            last_active
          )
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('matched_at', { ascending: false });

      if (error) throw error;

      // Transform the data to get the other user in each match
      const matches = data.map(match => {
        const otherUser = match.user1_id === userId 
          ? match.users!matches_user2_id_fkey 
          : match.users!matches_user1_id_fkey;
        
        return {
          id: match.id,
          matchedAt: match.matched_at,
          user: otherUser,
        };
      });

      return { matches, error: null };
    } catch (error) {
      return { matches: [], error };
    }
  }

  // Check if two users are matched
  static async checkIfMatched(user1Id: string, user2Id: string) {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      
      return { isMatched: !!data, error: null };
    } catch (error) {
      return { isMatched: false, error };
    }
  }

  // Get users at the same festival
  static async getFestivalUsers(
    festival: string,
    userId: string,
    limit: number = 50
  ) {
    try {
      // Get users the current user hasn't swiped on yet
      const { data: swipedUsers, error: swipedError } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', userId);

      if (swipedError) throw swipedError;

      const swipedIds = swipedUsers.map(swipe => swipe.swiped_id);

      // Get users at the same festival
      const { users, error } = await LocationService.getUsersAtFestival(
        festival,
        limit * 2
      );

      if (error) throw error;

      // Filter out already swiped users and the user themselves
      const festivalUsers = users.filter(
        user => !swipedIds.includes(user.id) && user.id !== userId
      );

      return { 
        users: festivalUsers.slice(0, limit), 
        error: null 
      };
    } catch (error) {
      return { users: [], error };
    }
  }

  // Get user's swipe history
  static async getSwipeHistory(userId: string, action?: 'like' | 'dislike' | 'superlike') {
    try {
      let query = supabase
        .from('swipes')
        .select(`
          id,
          action,
          created_at,
          users!swipes_swiped_id_fkey (
            id,
            name,
            age,
            festival,
            ticket_type,
            accommodation_type,
            interests,
            photos,
            last_active
          )
        `)
        .eq('swiper_id', userId)
        .order('created_at', { ascending: false });

      if (action) {
        query = query.eq('action', action);
      }

      const { data, error } = await query;

      if (error) throw error;

      const swipes = data.map(swipe => ({
        id: swipe.id,
        action: swipe.action,
        createdAt: swipe.created_at,
        user: swipe.users!swipes_swiped_id_fkey,
      }));

      return { swipes, error: null };
    } catch (error) {
      return { swipes: [], error };
    }
  }

  // Get match statistics
  static async getMatchStats(userId: string) {
    try {
      // Get total matches
      const { count: matchCount, error: matchError } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (matchError) throw matchError;

      // Get total likes given
      const { count: likesGiven, error: likesError } = await supabase
        .from('swipes')
        .select('*', { count: 'exact', head: true })
        .eq('swiper_id', userId)
        .eq('action', 'like');

      if (likesError) throw likesError;

      // Get total likes received
      const { count: likesReceived, error: receivedError } = await supabase
        .from('swipes')
        .select('*', { count: 'exact', head: true })
        .eq('swiped_id', userId)
        .eq('action', 'like');

      if (receivedError) throw receivedError;

      return {
        stats: {
          totalMatches: matchCount || 0,
          likesGiven: likesGiven || 0,
          likesReceived: likesReceived || 0,
          matchRate: likesGiven > 0 ? ((matchCount || 0) / likesGiven * 100).toFixed(1) : '0',
        },
        error: null
      };
    } catch (error) {
      return { 
        stats: { 
          totalMatches: 0, 
          likesGiven: 0, 
          likesReceived: 0, 
          matchRate: '0' 
        }, 
        error 
      };
    }
  }
} 