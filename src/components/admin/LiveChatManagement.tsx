import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  MessageCircle,
  Send,
  Loader2,
  User,
  Headphones,
  Circle,
  CheckCircle,
  Clock,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSession {
  id: string;
  user_id: string;
  status: 'waiting' | 'active' | 'ended';
  assigned_agent_id: string | null;
  started_at: string;
  ended_at: string | null;
  user_name?: string;
  unread_count?: number;
}

interface ChatMessage {
  id: string;
  session_id: string;
  content: string;
  sender_type: 'user' | 'agent' | 'system';
  sender_id: string | null;
  created_at: string;
}

export const LiveChatManagement = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load all chat sessions
  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('live_chat_sessions')
          .select('*')
          .in('status', ['waiting', 'active'])
          .order('started_at', { ascending: false });

        if (error) throw error;

        // Fetch user names
        const sessionsWithNames = await Promise.all(
          (data || []).map(async (session) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', session.user_id)
              .single();

            return {
              ...session,
              user_name: profile?.full_name || 'Anonymous User',
            } as ChatSession;
          })
        );

        setSessions(sessionsWithNames);
      } catch (error) {
        console.error('Error loading sessions:', error);
        toast.error('Failed to load chat sessions');
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();

    // Subscribe to new sessions
    const channel = supabase
      .channel('admin-live-chat-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_chat_sessions',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newSession = payload.new as any;
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', newSession.user_id)
              .single();

            setSessions((prev) => [
              {
                ...newSession,
                user_name: profile?.full_name || 'Anonymous User',
              } as ChatSession,
              ...prev,
            ]);
            toast.info('New chat request!');
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setSessions((prev) =>
              prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            );
            if (selectedSession?.id === updated.id) {
              setSelectedSession((prev) => (prev ? { ...prev, ...updated } : null));
            }
          } else if (payload.eventType === 'DELETE') {
            setSessions((prev) => prev.filter((s) => s.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSession?.id]);

  // Load messages when session is selected
  useEffect(() => {
    if (!selectedSession) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('session_id', selectedSession.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setMessages((data || []) as ChatMessage[]);
    };

    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`admin-chat-messages-${selectedSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `session_id=eq.${selectedSession.id}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSession?.id]);

  const handleJoinChat = async (session: ChatSession) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('live_chat_sessions')
        .update({
          status: 'active',
          assigned_agent_id: user.id,
        })
        .eq('id', session.id);

      if (error) throw error;

      // Send system message
      await supabase.from('live_chat_messages').insert({
        session_id: session.id,
        sender_type: 'system',
        content: 'A support agent has joined the chat. How can we help you today?',
      });

      setSelectedSession({ ...session, status: 'active', assigned_agent_id: user.id });
      toast.success('Joined chat');
    } catch (error) {
      console.error('Error joining chat:', error);
      toast.error('Failed to join chat');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedSession || !user || isSending) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setIsSending(true);

    try {
      const { error } = await supabase.from('live_chat_messages').insert({
        session_id: selectedSession.id,
        sender_type: 'agent',
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
    if (!selectedSession) return;

    try {
      // Send system message
      await supabase.from('live_chat_messages').insert({
        session_id: selectedSession.id,
        sender_type: 'system',
        content: 'This chat has been closed by the support agent. Thank you for contacting us!',
      });

      const { error } = await supabase
        .from('live_chat_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', selectedSession.id);

      if (error) throw error;

      setSessions((prev) => prev.filter((s) => s.id !== selectedSession.id));
      setSelectedSession(null);
      toast.success('Chat ended');
    } catch (error) {
      console.error('Error ending chat:', error);
      toast.error('Failed to end chat');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusIcon = (status: ChatSession['status']) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-3 w-3 text-amber-500" />;
      case 'active':
        return <Circle className="h-3 w-3 fill-green-500 text-green-500" />;
      case 'ended':
        return <CheckCircle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Live Chat Support
          {sessions.filter((s) => s.status === 'waiting').length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {sessions.filter((s) => s.status === 'waiting').length} waiting
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[400px]">
          {/* Session List */}
          <div className="border rounded-lg">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-medium text-sm">Active Chats ({sessions.length})</h3>
            </div>
            <ScrollArea className="h-[350px]">
              {sessions.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No active chats
                </div>
              ) : (
                <div className="divide-y">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className={cn(
                        'w-full p-3 text-left hover:bg-muted/50 transition-colors',
                        selectedSession?.id === session.id && 'bg-muted'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{session.user_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(session.started_at), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                        {getStatusIcon(session.status)}
                      </div>
                      {session.status === 'waiting' && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          Waiting for agent
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="md:col-span-2 border rounded-lg flex flex-col">
            {selectedSession ? (
              <>
                <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{selectedSession.user_name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {getStatusIcon(selectedSession.status)}
                        <span className="capitalize">{selectedSession.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedSession.status === 'waiting' && (
                      <Button size="sm" onClick={() => handleJoinChat(selectedSession)}>
                        Join Chat
                      </Button>
                    )}
                    {selectedSession.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={handleEndChat}>
                        <X className="h-4 w-4 mr-1" />
                        End Chat
                      </Button>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'flex gap-2',
                          message.sender_type === 'agent' ? 'flex-row-reverse' : 'flex-row'
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
                        <div>
                          <div
                            className={cn(
                              'rounded-lg px-3 py-2 max-w-md text-sm',
                              message.sender_type === 'agent'
                                ? 'bg-green-500 text-white'
                                : message.sender_type === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground italic'
                            )}
                          >
                            {message.content}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(message.created_at), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {selectedSession.status === 'active' && (
                  <div className="p-3 border-t flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isSending}>
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}

                {selectedSession.status === 'waiting' && (
                  <div className="p-4 border-t bg-amber-50 dark:bg-amber-950/20 text-center">
                    <p className="text-sm text-muted-foreground">
                      Click "Join Chat" to start helping this customer
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Select a chat to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
