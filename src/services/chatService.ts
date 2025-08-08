import { supabase } from '../utils/supabase';
import { Database } from '../utils/supabase';

type Message = Database['public']['Tables']['messages']['Row'];

export class ChatService {
  // Send a message
  static async sendMessage(
    matchId: string,
    senderId: string,
    text: string
  ) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: senderId,
          text: text,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;
      return { message: data, error: null };
    } catch (error) {
      return { message: null, error };
    }
  }

  // Get messages for a match
  static async getMessages(matchId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          text,
          sender_id,
          is_read,
          created_at,
          users!messages_sender_id_fkey (
            id,
            name,
            photos
          )
        `)
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      const messages = data.map(msg => ({
        id: msg.id,
        text: msg.text,
        senderId: msg.sender_id,
        isRead: msg.is_read,
        timestamp: new Date(msg.created_at),
        sender: msg.users!messages_sender_id_fkey,
      }));

      return { messages, error: null };
    } catch (error) {
      return { messages: [], error };
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(matchId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('match_id', matchId)
        .neq('sender_id', userId); // Don't mark own messages as read

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Get unread message count for a user
  static async getUnreadCount(userId: string) {
    try {
      // Get all matches for the user
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (matchesError) throw matchesError;

      if (matches.length === 0) {
        return { unreadCount: 0, error: null };
      }

      const matchIds = matches.map(match => match.id);

      // Count unread messages in all matches
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('match_id', matchIds)
        .eq('is_read', false)
        .neq('sender_id', userId);

      if (error) throw error;
      return { unreadCount: count || 0, error: null };
    } catch (error) {
      return { unreadCount: 0, error };
    }
  }

  // Get unread count per match
  static async getUnreadCountPerMatch(userId: string) {
    try {
      // Get all matches for the user
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (matchesError) throw matchesError;

      if (matches.length === 0) {
        return { unreadCounts: {}, error: null };
      }

      const matchIds = matches.map(match => match.id);

      // Get unread messages for each match
      const { data, error } = await supabase
        .from('messages')
        .select('match_id')
        .in('match_id', matchIds)
        .eq('is_read', false)
        .neq('sender_id', userId);

      if (error) throw error;

      // Count unread messages per match
      const unreadCounts: { [key: string]: number } = {};
      data.forEach(msg => {
        unreadCounts[msg.match_id] = (unreadCounts[msg.match_id] || 0) + 1;
      });

      return { unreadCounts, error: null };
    } catch (error) {
      return { unreadCounts: {}, error };
    }
  }

  // Subscribe to real-time messages for a match
  static subscribeToMessages(
    matchId: string,
    callback: (message: any) => void
  ) {
    return supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  }

  // Subscribe to all messages for a user
  static subscribeToAllMessages(
    userId: string,
    callback: (message: any) => void
  ) {
    // First get all matches for the user
    return supabase
      .channel(`user_messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          // Check if the message is in one of the user's matches
          const { data: match, error } = await supabase
            .from('matches')
            .select('user1_id, user2_id')
            .eq('id', payload.new.match_id)
            .single();

          if (!error && match && (match.user1_id === userId || match.user2_id === userId)) {
            callback(payload.new);
          }
        }
      )
      .subscribe();
  }

  // Get last message for each match
  static async getLastMessages(userId: string) {
    try {
      // Get all matches for the user
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
          id,
          matched_at,
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

      if (matchesError) throw matchesError;

      // Get last message for each match
      const matchesWithLastMessage = await Promise.all(
        matches.map(async (match) => {
          const { data: lastMessage, error: messageError } = await supabase
            .from('messages')
            .select(`
              id,
              text,
              sender_id,
              is_read,
              created_at
            `)
            .eq('match_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const otherUser = match.user1_id === userId 
            ? match.users!matches_user2_id_fkey 
            : match.users!matches_user1_id_fkey;

          return {
            id: match.id,
            matchedAt: match.matched_at,
            user: otherUser,
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              text: lastMessage.text,
              senderId: lastMessage.sender_id,
              timestamp: new Date(lastMessage.created_at),
              isRead: lastMessage.is_read,
            } : null,
          };
        })
      );

      return { matches: matchesWithLastMessage, error: null };
    } catch (error) {
      return { matches: [], error };
    }
  }

  // Delete a message (only sender can delete)
  static async deleteMessage(messageId: string, senderId: string) {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', senderId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  }
} 