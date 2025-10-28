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
      let { data, error } = await supabase
        .from('swipes')
        .insert({
          swiper_id: swiperId,
          swiped_id: swipedId,
          action: action,
        })
        .select()
        .single();

      if (error) {
        // If it's a duplicate swipe, that's okay - we can still check for matches
        if (error.code === '23505') {
          // Try to get the existing swipe data
          const { data: existingSwipe } = await supabase
            .from('swipes')
            .select('*')
            .eq('swiper_id', swiperId)
            .eq('swiped_id', swipedId)
            .eq('action', action)
            .single();
          
          if (existingSwipe) {
            data = existingSwipe;
          } else {
            throw error; // If we can't find the existing swipe, throw the error
          }
        } else {
          throw error;
        }
      }

      // Check for match if this is a like
      if (action === 'like') {
        try {
          const matchResult = await this.checkForMatch(swiperId, swipedId);
          if (matchResult.isMatch) {
            return { swipe: data, match: matchResult.match, error: null };
          }
        } catch (matchError: any) {
          // If it's a duplicate key error, handle it as an existing match
          if (matchError.code === '23505') {
            // Fetch the existing match
            const { data: existingMatch, error: fetchError } = await supabase
              .from('matches')
              .select('*')
              .or(`and(user1_id.eq.${swiperId},user2_id.eq.${swipedId}),and(user1_id.eq.${swipedId},user2_id.eq.${swiperId})`)
              .single();

            if (!fetchError && existingMatch) {
              return { swipe: data, match: existingMatch, error: null };
            }
          }
          // If we can't handle the error, continue without match
        }
      }

      return { swipe: data, match: null, error: null };
    } catch (error) {
      return { swipe: null, match: null, error };
    }
  }

  // Check if two users have matched (both liked each other)
  static async checkForMatch(user1Id: string, user2Id: string) {
    try {
      // Check if user2 has also liked user1
      const { data: existingSwipe, error } = await supabase
        .from('swipes')
        .select('*')
        .eq('swiper_id', user2Id)
        .eq('swiped_id', user1Id)
        .eq('action', 'like')
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors

      if (error) {
        throw error;
      }

      if (existingSwipe) {
        // Check if match already exists
        const { data: existingMatch, error: matchCheckError } = await supabase
          .from('matches')
          .select('*')
          .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
          .single();

        if (matchCheckError && matchCheckError.code !== 'PGRST116') {
          throw matchCheckError;
        }

        if (existingMatch) {
          return { isMatch: true, match: existingMatch, error: null };
        }

        // Both users liked each other - create a match
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            user1_id: user1Id,
            user2_id: user2Id,
          })
          .select()
          .single();

        if (matchError) {
          throw matchError; // Let the parent function handle it
        }

        return { isMatch: true, match, error: null };
      }

      return { isMatch: false, match: null, error: null };
    } catch (error) {
      return { isMatch: false, match: null, error };
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
        (user: any) => !swipedIds.includes(user.id) && user.id !== userId
      );

      return { 
        users: potentialMatches.slice(0, limit), 
        error: null 
      };
    } catch (error) {
      return { users: [], error };
    }
  }

  // Get direct messages (matches created through direct messaging)
  static async getDirectMessages(userId: string) {
    try {
      
      // Get matches where no mutual like exists (indicating it was a direct message match)
      const { data: allMatches, error: matchesError } = await supabase
        .from('matches')
        .select('id, matched_at, user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('matched_at', { ascending: false});

      if (matchesError) throw matchesError;

      // For each match, check if it was a real match (both users liked each other) or a direct message
      const directMessageMatches = [];
      
      for (const match of allMatches) {
        const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
        
        // Check if both users liked each other
        const { data: swipes, error: swipesError } = await supabase
          .from('swipes')
          .select('*')
          .or(`and(swiper_id.eq.${userId},swiped_id.eq.${otherUserId},action.eq.like),and(swiper_id.eq.${otherUserId},swiped_id.eq.${userId},action.eq.like)`);

        if (swipesError) {
          continue;
        }

        // If we don't have swipes from both users, it's a direct message
        const userLikedOther = swipes.some(swipe => swipe.swiper_id === userId && swipe.swiped_id === otherUserId);
        const otherLikedUser = swipes.some(swipe => swipe.swiper_id === otherUserId && swipe.swiped_id === userId);
        
        if (!userLikedOther || !otherLikedUser) {
          // Fetch the other user's data manually
          const { data: otherUser, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', otherUserId)
            .single();

          if (userError || !otherUser) {
            continue;
          }

          // Ensure photos is always an array
          let photos = [];
          if (otherUser.photos) {
            if (Array.isArray(otherUser.photos)) {
              photos = otherUser.photos;
            } else if (typeof otherUser.photos === 'string') {
              try {
                photos = JSON.parse(otherUser.photos);
              } catch {
                photos = [];
              }
            }
          }
          
          // Get the latest message for this match
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false})
            .limit(1)
            .single();

          directMessageMatches.push({
            id: match.id,
            user: {
              id: otherUser.id,
              name: otherUser.name || '',
              age: otherUser.age || 18,
              festival: otherUser.festival || '',
              ticket_type: otherUser.ticket_type || '',
              accommodation_type: otherUser.accommodation_type || '',
              interests: Array.isArray(otherUser.interests) ? otherUser.interests : (otherUser.interests || []),
              photos: photos,
              last_active: otherUser.last_active
            },
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              text: lastMessage.text,
              senderId: lastMessage.sender_id,
              timestamp: new Date(lastMessage.created_at),
              isRead: lastMessage.is_read
            } : null,
            isDirectMessage: true
          });
        }
      }

      return { messages: directMessageMatches, error: null };
    } catch (error) {
      console.error('MatchingService: Error getting direct messages:', error);
      return { messages: [], error };
    }
  }

  // Get user's matches (only real matches where both users liked each other)
  static async getUserMatches(userId: string) {
    try {
      // Get matches where user is either user1 or user2
      const { data: allMatches, error } = await supabase
        .from('matches')
        .select('id, matched_at, user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('matched_at', { ascending: false });

      if (error) throw error;

      // Filter for real matches only (where both users liked each other)
      const realMatches = [];
      
      for (const match of allMatches) {
        const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
        
        // Check if both users liked each other
        const { data: swipes, error: swipesError } = await supabase
          .from('swipes')
          .select('*')
          .or(`and(swiper_id.eq.${userId},swiped_id.eq.${otherUserId},action.eq.like),and(swiper_id.eq.${otherUserId},swiped_id.eq.${userId},action.eq.like)`);

        if (swipesError) {
          continue;
        }

        // Only include if both users liked each other (real match)
        const userLikedOther = swipes.some(swipe => swipe.swiper_id === userId && swipe.swiped_id === otherUserId);
        const otherLikedUser = swipes.some(swipe => swipe.swiper_id === otherUserId && swipe.swiped_id === userId);
        
        if (userLikedOther && otherLikedUser) {
          // Fetch the other user's data manually
          const { data: otherUser, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', otherUserId)
            .single();

          if (userError || !otherUser) {
            continue;
          }

          // Ensure photos is always an array
          let photos = [];
          if (otherUser.photos) {
            if (Array.isArray(otherUser.photos)) {
              photos = otherUser.photos;
            } else if (typeof otherUser.photos === 'string') {
              try {
                photos = JSON.parse(otherUser.photos);
              } catch {
                photos = [];
              }
            }
          }

          // Get the latest message for this match
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          realMatches.push({
            id: match.id,
            matchedAt: match.matched_at,
            user: {
              id: otherUser.id,
              name: otherUser.name || '',
              age: otherUser.age || 18,
              festival: otherUser.festival || '',
              ticket_type: otherUser.ticket_type || '',
              accommodation_type: otherUser.accommodation_type || '',
              interests: Array.isArray(otherUser.interests) ? otherUser.interests : (otherUser.interests || []),
              photos: photos,
              last_active: otherUser.last_active
            },
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              text: lastMessage.text,
              senderId: lastMessage.sender_id,
              timestamp: new Date(lastMessage.created_at),
              isRead: lastMessage.is_read
            } : null,
            isRealMatch: true
          });
        }
      }

      return { matches: realMatches, error: null };
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

  // Convert a direct message to a regular match by creating a swipe
  static async convertDMToMatch(accepterId: string, senderId: string) {
    try {
      // Create a swipe from the accepter to the sender (like action)
      const { data: swipe, error: swipeError } = await supabase
        .from('swipes')
        .insert({
          swiper_id: accepterId,
          swiped_id: senderId,
          action: 'like',
        })
        .select()
        .single();

      if (swipeError && swipeError.code !== '23505') { // Ignore duplicate key errors
        throw swipeError;
      }
      return { success: true, error: null };
    } catch (error) {
      console.error('Error converting DM to match:', error);
      return { success: false, error };
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
        .select('id, action, created_at, swiped_id')
        .eq('swiper_id', userId)
        .order('created_at', { ascending: false });

      if (action) {
        query = query.eq('action', action);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Manually fetch user data for each swipe
      const swipes = await Promise.all(data.map(async (swipe) => {
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('id', swipe.swiped_id)
          .single();

        return {
          id: swipe.id,
          action: swipe.action,
          createdAt: swipe.created_at,
          user: user ? {
            id: user.id,
            name: user.name,
            age: user.age,
            festival: user.festival,
            ticket_type: user.ticket_type,
            accommodation_type: user.accommodation_type,
            interests: user.interests,
            photos: user.photos,
            last_active: user.last_active
          } : null,
        };
      }));

      return { swipes, error: null };
    } catch (error) {
      return { swipes: [], error };
    }
  }

  // Clear all swipes for testing (development only)
  static async clearAllSwipes() {
    try {
      const { error } = await supabase
        .from('swipes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all swipes

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('Error clearing swipes:', error);
      return { success: false, error };
    }
  }

  // Get all users sorted by distance, closest first (regardless of festival)
  static async getAllUsersByDistance(
    userId: string,
    userLocation: { latitude: number; longitude: number },
    limit: number = 50
  ) {
    try {
      // Get users the current user hasn't swiped on yet
      const { data: swipedUsers, error: swipedError } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', userId);

      if (swipedError) {
        console.error('MatchingService: Error fetching swipes:', swipedError);
        throw swipedError;
      }

      const swipedIds = swipedUsers?.map(swipe => swipe.swiped_id) || [];

      let allUsers: any[] = [];

      // First try to get users with location data
      const { data: usersWithLocation, error: locationError } = await supabase
        .from('users')
        .select('*')
        .not('location', 'is', null);

      if (locationError) {
        // Fallback to all users if location query fails
      } else {
        allUsers = usersWithLocation || [];
      }

      // If no users with location (error or empty result), get all users
      if (allUsers.length === 0) {
        const { data: allUsersData, error: allUsersError } = await supabase
          .from('users')
          .select('*');

        if (allUsersError) {
          console.error('MatchingService: Error fetching all users:', allUsersError);
          throw allUsersError;
        }
        allUsers = allUsersData || [];
      }

      // Calculate distances and filter out already swiped users and self
      const usersWithDistance = allUsers
        .filter((user: any) => {
          // Explicitly filter out the current user by ID (using strict comparison)
          if (String(user.id) === String(userId)) {
            return false;
          }
          
          // Filter out already swiped users
          const isSwiped = swipedIds.some(id => String(id) === String(user.id));
          return !isSwiped;
        })
        .map((user: any) => {
          // Ensure photos is always an array
          let photos = [];
          if (user.photos) {
            if (Array.isArray(user.photos)) {
              photos = user.photos;
            } else if (typeof user.photos === 'string') {
              // Try to parse if it's a JSON string
              try {
                photos = JSON.parse(user.photos);
              } catch {
                photos = [];
              }
            }
          }
          
          return {
            id: user.id,
            name: user.name || '',
            age: user.age || 18,
            gender: user.gender || 'Other',
            festival: user.festival || '',
            ticketType: user.ticket_type || '', // Map from snake_case to camelCase
            accommodationType: user.accommodation_type || '', // Map from snake_case to camelCase
            photos: photos,
            interests: Array.isArray(user.interests) ? user.interests : (user.interests || []),
            lastSeen: user.last_active,
            distance: user.location ? 
              LocationService.calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                user.location.latitude,
                user.location.longitude
              ) : 
              999 // High distance for users without location
          };
        })
        .sort((a, b) => a.distance - b.distance) // Sort by distance, closest first
        .slice(0, limit);

      return { 
        users: usersWithDistance, 
        error: null 
      };
    } catch (error: any) {
      console.error('MatchingService: Error in getAllUsersByDistance:', error?.message || error);
      return { users: [], error };
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
          matchRate: (likesGiven || 0) > 0 ? ((matchCount || 0) / (likesGiven || 0) * 100).toFixed(1) : '0',
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

  // Clear all matches and messages (for testing purposes)
  static async clearAllMatchesAndMessages() {
    try {
      
      // Delete all messages first (due to foreign key constraints)
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all messages

      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
      } else {
      }

      // Delete all direct messages if table exists
      try {
        const { error: dmError } = await supabase
          .from('direct_messages')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all direct messages

        if (dmError && dmError.code !== '42P01') { // Ignore table not found error
          console.error('Error deleting direct messages:', dmError);
        } else {
        }
      } catch (dmError) {
      }

      // Delete all matches
      const { error: matchesError } = await supabase
        .from('matches')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all matches

      if (matchesError) {
        console.error('Error deleting matches:', matchesError);
      } else {
      }

      // Delete all swipes
      const { error: swipesError } = await supabase
        .from('swipes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all swipes

      if (swipesError) {
        console.error('Error deleting swipes:', swipesError);
      } else {
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error clearing matches and messages:', error);
      return { success: false, error };
    }
  }

  // Delete all users (for testing purposes)
  static async deleteAllUsers() {
    try {
      // Delete all matches first (due to foreign key constraints)
      const { error: matchesError } = await supabase
        .from('matches')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all matches

      if (matchesError) throw matchesError;

      // Delete all swipes
      const { error: swipesError } = await supabase
        .from('swipes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all swipes

      if (swipesError) throw swipesError;

      // Delete all users
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all users

      if (usersError) throw usersError;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting all users:', error);
      return { success: false, error };
    }
  }

  // Remove a specific connection/match between two users
  static async removeConnection(user1Id: string, user2Id: string) {
    try {
      
      // Delete all messages between these users
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .or(`and(match_id.eq.${user1Id},match_id.eq.${user2Id})`);

      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
      }

      // Delete direct messages between these users
      try {
        const { error: dmError } = await supabase
          .from('direct_messages')
          .delete()
          .or(`and(sender_id.eq.${user1Id},recipient_id.eq.${user2Id}),and(sender_id.eq.${user2Id},recipient_id.eq.${user1Id})`);

        if (dmError && dmError.code !== '42P01') { // Ignore table not found error
          console.error('Error deleting direct messages:', dmError);
        }
      } catch (dmError) {
      }

      // Delete the match
      const { error: matchError } = await supabase
        .from('matches')
        .delete()
        .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`);

      if (matchError) {
        console.error('Error deleting match:', matchError);
      }

      // Delete all swipes between these users
      const { error: swipesError } = await supabase
        .from('swipes')
        .delete()
        .or(`and(swiper_id.eq.${user1Id},swiped_id.eq.${user2Id}),and(swiper_id.eq.${user2Id},swiped_id.eq.${user1Id})`);

      if (swipesError) {
        console.error('Error deleting swipes:', swipesError);
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error removing connection:', error);
      return { success: false, error };
    }
  }

  // Subscribe to new matches for a user in real-time
  static subscribeToMatches(
    userId: string,
    callback: (newMatch: any) => void
  ) {
    
    const channel = supabase
      .channel(`matches:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `or(user1_id.eq.${userId},user2_id.eq.${userId})`,
        },
        async (payload) => {
          const newMatch = payload.new as any;
          
          // Determine the other user's ID
          const otherUserId = newMatch.user1_id === userId ? newMatch.user2_id : newMatch.user1_id;
          
          // Fetch the other user's data
          const { data: otherUser, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', otherUserId)
            .single();

          if (!userError && otherUser) {
            // Ensure photos is always an array
            let photos = [];
            if (otherUser.photos) {
              if (Array.isArray(otherUser.photos)) {
                photos = otherUser.photos;
              } else if (typeof otherUser.photos === 'string') {
                try {
                  photos = JSON.parse(otherUser.photos);
                } catch {
                  photos = [];
                }
              }
            }

            callback({
              id: newMatch.id,
              matchedAt: new Date(newMatch.matched_at || new Date()),
              user: {
                id: otherUser.id,
                name: otherUser.name || '',
                age: otherUser.age || 18,
                gender: otherUser.gender || 'Other',
                festival: otherUser.festival || '',
                ticketType: otherUser.ticket_type || '',
                accommodationType: otherUser.accommodation_type || '',
                interests: Array.isArray(otherUser.interests) ? otherUser.interests : (otherUser.interests || []),
                photos: photos,
                lastSeen: otherUser.last_active || new Date().toISOString()
              },
              lastMessage: null,
              isRealMatch: true
            });
          }
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      }
    };
  }
} 