import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface Conversation {
  id: string;
  booking_id: string | null;
  user_id: string;
  salon_id: string;
  salon_name: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'salon';
  content: string;
  is_read: boolean;
  created_at: string;
  image_url?: string | null;
  read_at?: string | null;
}

interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

// Salon auto-reply messages
const salonAutoReplies = [
  "Thank you for your message! We'll get back to you shortly.",
  "Hi there! Your appointment details look great. See you soon!",
  "Thanks for reaching out! Our team will respond within the hour.",
  "We appreciate your patience. Is there anything specific you'd like to know?",
  "Hello! We've received your message and will respond as soon as possible.",
];

const getRandomReply = () => {
  return salonAutoReplies[Math.floor(Math.random() * salonAutoReplies.length)];
};

export const useChat = (conversationId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTyping, setIsTyping] = useState(false);

  // Subscribe to real-time messages and reactions
  useEffect(() => {
    if (!conversationId) return;

    const messagesChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('Message update received:', payload);
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['unread-count'] });
        }
      )
      .subscribe();

    const reactionsChannel = supabase
      .channel(`reactions:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reactions', conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [conversationId, queryClient]);

  // Fetch total unread count
  const { data: totalUnreadCount = 0 } = useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => {
      if (!user) return 0;

      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, conversations!inner(user_id)')
        .eq('sender_type', 'salon')
        .eq('is_read', false)
        .eq('conversations.user_id', user.id);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }
      return data?.length || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Fetch all conversations with unread counts
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const conversationsWithUnread = await Promise.all(
        (data as Conversation[]).map(async (conv) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('sender_type', 'salon')
            .eq('is_read', false);

          return { ...conv, unread_count: count || 0 };
        })
      );

      return conversationsWithUnread;
    },
    enabled: !!user,
  });

  // Fetch messages for a conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
  });

  // Fetch reactions for messages in a conversation
  const { data: reactions = [] } = useQuery({
    queryKey: ['reactions', conversationId],
    queryFn: async () => {
      if (!conversationId || messages.length === 0) return [];

      const messageIds = messages.map((m) => m.id);
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);

      if (error) throw error;
      return data as MessageReaction[];
    },
    enabled: !!conversationId && messages.length > 0,
  });

  // Create or get conversation for a booking
  const getOrCreateConversation = useMutation({
    mutationFn: async ({ bookingId, salonId, salonName }: { bookingId: string; salonId: string; salonName: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (existing) return existing as Conversation;

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          booking_id: bookingId,
          user_id: user.id,
          salon_id: salonId,
          salon_name: salonName,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive',
      });
    },
  });

  // Simulate salon reading messages and auto-reply
  const simulateSalonReadAndReply = async (convId: string, messageId: string) => {
    // Simulate salon reading the message after 0.5-1 second
    const readDelay = 500 + Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, readDelay));
    
    // Mark the user's message as read by salon
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId);
    
    queryClient.invalidateQueries({ queryKey: ['messages', convId] });
    
    // Show typing indicator
    setIsTyping(true);
    
    // Wait 1-2 more seconds before replying
    const replyDelay = 1000 + Math.random() * 1000;
    await new Promise(resolve => setTimeout(resolve, replyDelay));
    
    setIsTyping(false);
    
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        sender_type: 'salon',
        content: getRandomReply(),
      });

    if (error) {
      console.error('Error sending auto-reply:', error);
    }
  };

  // Send a message (with optional image)
  const sendMessage = useMutation({
    mutationFn: async ({ conversationId, content, imageUrl }: { conversationId: string; content: string; imageUrl?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'user',
          content: content.trim() || (imageUrl ? '📷 Image' : ''),
          image_url: imageUrl || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Message;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      // Trigger salon read receipt and auto-reply (demo feature)
      if (variables.content.trim()) {
        simulateSalonReadAndReply(variables.conversationId, data.id);
      }
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    },
  });

  // Add reaction to a message
  const addReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if user already reacted with this emoji
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        // Remove reaction if already exists
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return { action: 'removed' };
      } else {
        // Add new reaction
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji,
          });

        if (error) throw error;
        return { action: 'added' };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions', conversationId] });
    },
    onError: (error) => {
      console.error('Error toggling reaction:', error);
    },
  });

  // Mark messages as read
  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'salon')
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  // Helper to get reactions for a specific message
  const getMessageReactions = (messageId: string) => {
    const messageReactions = reactions.filter((r) => r.message_id === messageId);
    const groupedReactions: { emoji: string; count: number; hasReacted: boolean }[] = [];

    messageReactions.forEach((reaction) => {
      const existing = groupedReactions.find((r) => r.emoji === reaction.emoji);
      if (existing) {
        existing.count++;
        if (reaction.user_id === user?.id) {
          existing.hasReacted = true;
        }
      } else {
        groupedReactions.push({
          emoji: reaction.emoji,
          count: 1,
          hasReacted: reaction.user_id === user?.id,
        });
      }
    });

    return groupedReactions;
  };

  return {
    conversations,
    conversationsLoading,
    messages,
    messagesLoading,
    getOrCreateConversation,
    sendMessage,
    markAsRead,
    totalUnreadCount,
    isTyping,
    addReaction,
    getMessageReactions,
  };
};
