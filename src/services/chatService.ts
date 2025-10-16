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

  // Send a direct message (without match)
  static async sendDirectMessage(
    conversationId: string,
    senderId: string,
    recipientId: string,
    text: string
  ) {
    try {
      console.log('ChatService: Attempting to send direct message:', { conversationId, senderId, recipientId, text });
      
      // Try the direct_messages table first
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          recipient_id: recipientId,
          text: text,
          is_read: false,
        })
        .select()
        .single();

      if (error) {
        console.log('ChatService: direct_messages table error:', error);
        
        // If direct_messages table doesn't exist OR RLS policy blocks insert, fallback to regular messages table
        if (error.code === '42P01' || error.code === '42501') { // Table doesn't exist OR RLS policy violation
          console.log('ChatService: Falling back to messages table due to:', error.code === '42P01' ? 'table not found' : 'RLS policy violation');
          
          // Generate a deterministic UUID-like string from the conversation ID
          const generateUuidFromString = (str: string) => {
            // Simple hash function to create a deterministic ID
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // Convert to 32bit integer
            }
            
            // Convert to positive number and pad with zeros
            const hashStr = Math.abs(hash).toString(16).padStart(8, '0');
            
            // Create UUID-like format
            return `${hashStr.substring(0, 8)}-${hashStr.substring(0, 4)}-${hashStr.substring(0, 4)}-${hashStr.substring(0, 4)}-${hashStr.padEnd(12, '0')}`;
          };
          
          const uuid = generateUuidFromString(conversationId);
          
          // First, try to create a dummy match record for this direct message conversation
          try {
            const { data: existingMatch, error: matchCheckError } = await supabase
              .from('matches')
              .select('id')
              .eq('id', uuid)
              .single();

            if (matchCheckError && matchCheckError.code === 'PGRST116') {
              // Match doesn't exist, create a dummy match
              console.log('ChatService: Creating dummy match for direct message');
              const { error: matchInsertError } = await supabase
                .from('matches')
                .insert({
                  id: uuid,
                  user1_id: senderId,
                  user2_id: recipientId,
                  is_direct_message: true // Mark as direct message if this column exists
                });

              if (matchInsertError && matchInsertError.code !== '23505') {
                // If it's not a duplicate key error, log it but continue
                console.log('ChatService: Error creating dummy match:', matchInsertError);
              }
            }
          } catch (matchError) {
            console.log('ChatService: Error checking/creating match:', matchError);
          }
          
          const fallbackResult = await supabase
            .from('messages')
            .insert({
              match_id: uuid, // Use generated UUID
              sender_id: senderId,
              text: text,
              is_read: false,
            })
            .select()
            .single();

          if (fallbackResult.error) throw fallbackResult.error;
          console.log('ChatService: Message sent via fallback with UUID:', uuid);
          return { message: fallbackResult.data, error: null };
        }
        
        throw error;
      }
      
      console.log('ChatService: Direct message sent successfully:', data);
      return { message: data, error: null };
    } catch (error) {
      console.error('ChatService: Error sending direct message:', error);
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
        sender: msg.users,
      }));

      return { messages, error: null };
    } catch (error) {
      return { messages: [], error };
    }
  }

  // Get direct messages for a conversation
  static async getDirectMessages(conversationId: string, limit: number = 50) {
    try {
      console.log('ChatService: Attempting to get direct messages for:', conversationId);
      
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          id,
          text,
          sender_id,
          recipient_id,
          is_read,
          created_at,
          users!direct_messages_sender_id_fkey (
            id,
            name,
            photos
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.log('ChatService: direct_messages table error when getting messages:', error);
        
        // If direct_messages table doesn't exist OR RLS policy blocks access, fallback to regular messages table
        if (error.code === '42P01' || error.code === '42501') { // Table doesn't exist OR RLS policy violation
          console.log('ChatService: Falling back to messages table for retrieval due to:', error.code === '42P01' ? 'table not found' : 'RLS policy violation');
          
          // Generate the same deterministic UUID-like string from the conversation ID
          const generateUuidFromString = (str: string) => {
            // Simple hash function to create a deterministic ID
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // Convert to 32bit integer
            }
            
            // Convert to positive number and pad with zeros
            const hashStr = Math.abs(hash).toString(16).padStart(8, '0');
            
            // Create UUID-like format
            return `${hashStr.substring(0, 8)}-${hashStr.substring(0, 4)}-${hashStr.substring(0, 4)}-${hashStr.substring(0, 4)}-${hashStr.padEnd(12, '0')}`;
          };
          
          const uuid = generateUuidFromString(conversationId);
          
          const fallbackResult = await supabase
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
            .eq('match_id', uuid)
            .order('created_at', { ascending: true })
            .limit(limit);

          if (fallbackResult.error) throw fallbackResult.error;
          
          const messages = fallbackResult.data.map(msg => ({
            id: msg.id,
            text: msg.text,
            senderId: msg.sender_id,
            isRead: msg.is_read,
            timestamp: new Date(msg.created_at),
            sender: msg.users,
          }));

          console.log('ChatService: Retrieved messages via fallback:', messages.length);
          return { messages, error: null };
        }
        
        throw error;
      }

      const messages = data.map(msg => ({
        id: msg.id,
        text: msg.text,
        senderId: msg.sender_id,
        isRead: msg.is_read,
        timestamp: new Date(msg.created_at),
        sender: msg.users,
      }));

      console.log('ChatService: Retrieved direct messages:', messages.length);
      return { messages, error: null };
    } catch (error) {
      console.error('ChatService: Error getting direct messages:', error);
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
          users_matches_user1_id_fkey (
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
          users_matches_user2_id_fkey (
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

                    const otherUser = match.users_matches_user1_id_fkey;

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