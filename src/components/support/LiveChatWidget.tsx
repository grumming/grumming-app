import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, User, Headphones, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  content: string;
  sender_type: 'user' | 'agent' | 'system';
  sender_id: string | null;
  created_at: string;
}

interface ChatSession {
  id: string;
  status: 'waiting' | 'active' | 'ended';
  assigned_agent_id: string | null;
}

const quickResponses = [
  'How do I cancel a booking?',
  'Where is my refund?',
  'How to contact salon?',
  'Payment issues',
];

export const LiveChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load or create session when chat opens
  useEffect(() => {
    if (!isOpen || !user) return;

    const loadOrCreateSession = async () => {
      setIsLoading(true);
      try {
        // Check for existing active session
        const { data: existingSession, error: fetchError } = await supabase
          .from('live_chat_sessions')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['waiting', 'active'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (existingSession) {
          setSession({
            id: existingSession.id,
            status: existingSession.status as ChatSession['status'],
            assigned_agent_id: existingSession.assigned_agent_id,
          });

          // Load existing messages
          const { data: existingMessages } = await supabase
            .from('live_chat_messages')
            .select('*')
            .eq('session_id', existingSession.id)
            .order('created_at', { ascending: true });

          if (existingMessages) {
            setMessages(existingMessages as ChatMessage[]);
          }
        } else if (fetchError?.code === 'PGRST116') {
          // No session exists, create new one
          const { data: newSession, error: createError } = await supabase
            .from('live_chat_sessions')
            .insert({ user_id: user.id })
            .select()
            .single();

          if (createError) throw createError;

          setSession({
            id: newSession.id,
            status: 'waiting',
            assigned_agent_id: null,
          });

          // Add welcome system message
          const { data: welcomeMsg } = await supabase
            .from('live_chat_messages')
            .insert({
              session_id: newSession.id,
              sender_type: 'system',
              content: 'Welcome to Grumming Support! 👋 A support agent will be with you shortly. Average wait time: 2-3 minutes.',
            })
            .select()
            .single();

          if (welcomeMsg) {
            setMessages([welcomeMsg as ChatMessage]);
          }
        }
      } catch (error) {
        console.error('Error loading chat session:', error);
        toast.error('Failed to start chat session');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrCreateSession();
  }, [isOpen, user]);

  // Subscribe to real-time updates and presence for typing indicators
  useEffect(() => {
    if (!session?.id || !user) return;

    const messagesChannel = supabase
      .channel(`live-chat-messages-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    const sessionChannel = supabase
      .channel(`live-chat-session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_chat_sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const updatedSession = payload.new as any;
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  status: updatedSession.status,
                  assigned_agent_id: updatedSession.assigned_agent_id,
                }
              : null
          );

          if (updatedSession.status === 'active' && session.status === 'waiting') {
            toast.success('An agent has joined the chat!');
          }
        }
      )
      .subscribe();

    // Presence channel for typing indicators
    const presenceChannel = supabase
      .channel(`typing-${session.id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const agents = Object.values(state).flat().filter((p: any) => p.type === 'agent' && p.isTyping);
        setIsAgentTyping(agents.length > 0);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            type: 'user',
            userId: user.id,
            isTyping: false,
          });
        }
      });

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [session?.id, session?.status, user]);

  // Handle typing indicator broadcast
  const updateTypingStatus = useCallback(async (typing: boolean) => {
    if (!session?.id || !user) return;
    
    const channel = supabase.channel(`typing-${session.id}`);
    await channel.track({
      type: 'user',
      userId: user.id,
      isTyping: typing,
    });
  }, [session?.id, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      updateTypingStatus(true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 2000);
  };

  const handleSend = async (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText || !session || !user || isSending) return;

    setIsSending(true);
    setInputValue('');
    
    // Stop typing indicator
    setIsTyping(false);
    updateTypingStatus(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      const { error } = await supabase.from('live_chat_messages').insert({
        session_id: session.id,
        sender_type: 'user',
        sender_id: user.id,
        content: messageText,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setInputValue(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleEndChat = async () => {
    if (!session) return;

    try {
      await supabase
        .from('live_chat_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', session.id);

      setSession(null);
      setMessages([]);
      setIsOpen(false);
      toast.success('Chat ended');
    } catch (error) {
      console.error('Error ending chat:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getStatusBadge = () => {
    if (!session) return null;
    switch (session.status) {
      case 'waiting':
        return (
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Circle className="h-2 w-2 fill-amber-500 text-amber-500" />
            Waiting for agent
          </Badge>
        );
      case 'active':
        return (
          <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-green-500/10 text-green-600">
            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
            Connected
          </Badge>
        );
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <Button
        onClick={() => toast.info('Please log in to use live chat')}
        className={cn(
          'fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg'
        )}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg',
          isOpen && 'hidden'
        )}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 z-50 w-[calc(100%-2rem)] max-w-sm shadow-2xl border-2">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5" />
              <div>
                <CardTitle className="text-base font-medium">Live Support</CardTitle>
                {getStatusBadge()}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {session && session.status !== 'ended' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={handleEndChat}
                >
                  End
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="h-72 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-72 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-2',
                        message.sender_type === 'user' ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarFallback
                          className={cn(
                            message.sender_type === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : message.sender_type === 'agent'
                              ? 'bg-green-500 text-white'
                              : 'bg-muted'
                          )}
                        >
                          {message.sender_type === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Headphones className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          'rounded-lg px-3 py-2 max-w-[80%] text-sm',
                          message.sender_type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : message.sender_type === 'agent'
                            ? 'bg-green-500/10 border border-green-500/20'
                            : 'bg-muted'
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  {isAgentTyping && (
                    <div className="flex gap-2">
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarFallback className="bg-green-500 text-white">
                          <Headphones className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="rounded-lg px-3 py-2 bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  {isSending && (
                    <div className="flex justify-end">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            )}

            {/* Quick Responses */}
            {session?.status === 'waiting' && (
              <div className="px-4 pb-2">
                <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickResponses.map((response, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(response)}
                      className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      {response}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t flex gap-2">
              <Input
                placeholder="Type a message..."
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className="flex-1"
                disabled={!session || session.status === 'ended'}
              />
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isSending || !session}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
