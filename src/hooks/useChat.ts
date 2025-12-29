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

  // Subscribe to real-time messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['unread-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
    refetchInterval: 30000, // Refetch every 30 seconds
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

      // Fetch unread counts for each conversation
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

  // Create or get conversation for a booking
  const getOrCreateConversation = useMutation({
    mutationFn: async ({ bookingId, salonId, salonName }: { bookingId: string; salonId: string; salonName: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if conversation exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (existing) return existing as Conversation;

      // Create new conversation
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

  // Simulate salon auto-reply
  const simulateSalonReply = async (convId: string) => {
    // Show typing indicator
    setIsTyping(true);
    
    // Wait 1-3 seconds before replying
    const delay = 1000 + Math.random() * 2000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    setIsTyping(false);
    
    // Insert salon reply using service role (simulated - in production this would be from salon side)
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

  // Send a message
  const sendMessage = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'user',
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as Message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      // Trigger salon auto-reply (demo feature)
      simulateSalonReply(variables.conversationId);
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
  };
};
