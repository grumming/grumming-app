import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, User, Store, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePresence } from '@/hooks/usePresence';
import { format } from 'date-fns';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  content: string;
  is_read: boolean;
  created_at: string;
  image_url?: string | null;
}

interface SalonOwnerChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    user_id: string;
    salon_name: string;
    service_name: string;
    customer_name?: string;
  };
  salonId: string;
  onMessagesRead?: () => void;
}

const SalonOwnerChatDialog = ({ open, onOpenChange, booking, salonId, onMessagesRead }: SalonOwnerChatDialogProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Presence tracking for customers
  const { isUserOnline } = usePresence('grumming-presence');
  const isCustomerOnline = isUserOnline(booking.user_id);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch or create conversation and load messages
  useEffect(() => {
    if (!open || !booking) return;

    const fetchConversation = async () => {
      setIsLoading(true);

      try {
        // Try to find existing conversation
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('*')
          .eq('booking_id', booking.id)
          .maybeSingle();

        if (existingConv) {
          setConversationId(existingConv.id);
          
          // Fetch messages
          const { data: messagesData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', existingConv.id)
            .order('created_at', { ascending: true });

          setMessages(messagesData || []);

          // Mark user messages as read by salon
          const { data: updatedMessages } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', existingConv.id)
            .eq('sender_type', 'user')
            .eq('is_read', false)
            .select();

          // Notify parent to refresh unread counts if messages were marked read
          if (updatedMessages && updatedMessages.length > 0 && onMessagesRead) {
            onMessagesRead();
          }
        } else {
          // Create new conversation
          const { data: newConv, error } = await supabase
            .from('conversations')
            .insert({
              booking_id: booking.id,
              user_id: booking.user_id,
              salon_id: salonId,
              salon_name: booking.salon_name,
            })
            .select()
            .single();

          if (error) throw error;
          setConversationId(newConv.id);
          setMessages([]);
        }
      } catch (err) {
        console.error('Error fetching conversation:', err);
        toast({
          title: 'Error',
          description: 'Failed to load conversation',
          variant: 'destructive',
        });
      }

      setIsLoading(false);
    };

    fetchConversation();
  }, [open, booking, salonId, toast]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`salon-messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Clear typing indicator when a message is received from customer
          if (newMsg.sender_type === 'user') {
            setIsCustomerTyping(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Subscribe to typing indicator broadcasts
  useEffect(() => {
    if (!conversationId) return;

    const typingChannel = supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { senderType, isTyping } = payload.payload;
        
        // Only show typing indicator for customer messages
        if (senderType === 'user') {
          setIsCustomerTyping(isTyping);
          
          // Clear typing indicator after 3 seconds if no update
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          if (isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
              setIsCustomerTyping(false);
            }, 3000);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    setIsSending(true);

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'salon',
          content: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }

    setIsSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                  isCustomerOnline ? 'bg-green-500' : 'bg-muted-foreground/40'
                }`}
              />
            </div>
            <div>
              <p className="font-medium text-base">{booking.customer_name || 'Customer'}</p>
              <p className="text-xs text-muted-foreground font-normal">
                {isCustomerTyping ? 'Typing...' : isCustomerOnline ? 'Online' : 'Offline'} • {booking.service_name}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Store className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start the conversation with your customer</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => {
                  const isSalon = message.sender_type === 'salon';
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`flex ${isSalon ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          isSalon
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted rounded-bl-sm'
                        }`}
                      >
                        {message.image_url && (
                          <img
                            src={message.image_url}
                            alt="Attachment"
                            className="rounded-lg max-w-full mb-2"
                          />
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <p
                          className={`text-[10px] mt-1 ${
                            isSalon ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}
                        >
                          {format(new Date(message.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {/* Typing Indicator */}
              <AnimatePresence>
                {isCustomerTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex justify-start"
                  >
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2 flex items-center gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="p-3 border-t bg-background">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSending || isLoading}
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending || isLoading}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalonOwnerChatDialog;
