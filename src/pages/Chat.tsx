import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import EmojiPicker from '@/components/chat/EmojiPicker';
import MessageReactions from '@/components/chat/MessageReactions';
import ChatImageUpload from '@/components/chat/ChatImageUpload';
import ReadReceipt from '@/components/chat/ReadReceipt';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
      <div className="flex items-center gap-1">
        <motion.span
          className="w-2 h-2 bg-muted-foreground/50 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="w-2 h-2 bg-muted-foreground/50 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
        />
        <motion.span
          className="w-2 h-2 bg-muted-foreground/50 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </div>
  </div>
);

const Chat = () => {
  const { conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [message, setMessage] = useState('');
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    conversations,
    conversationsLoading,
    messages,
    messagesLoading,
    getOrCreateConversation,
    sendMessage,
    markAsRead,
    isTyping,
    addReaction,
    getMessageReactions,
    broadcastTyping,
  } = useChat(conversationId);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [activeConversation, setActiveConversation] = useState<string | undefined>(conversationId);

  // Get booking params for creating new conversation
  const bookingId = searchParams.get('bookingId');
  const salonId = searchParams.get('salonId');
  const salonName = searchParams.get('salonName');

  // Create conversation if coming from booking
  useEffect(() => {
    if (bookingId && salonId && salonName && user && !conversationId) {
      getOrCreateConversation.mutate(
        { bookingId, salonId, salonName },
        {
          onSuccess: (conversation) => {
            navigate(`/chat/${conversation.id}`, { replace: true });
            setActiveConversation(conversation.id);
          },
        }
      );
    }
  }, [bookingId, salonId, salonName, user, conversationId]);

  // Scroll to bottom on new messages or typing
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Mark messages as read
  useEffect(() => {
    if (activeConversation) {
      markAsRead.mutate(activeConversation);
    }
  }, [activeConversation, messages]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSend = () => {
    if ((!message.trim() && !pendingImageUrl) || !activeConversation) return;

    // Clear typing indicator when sending
    broadcastTyping(activeConversation, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendMessage.mutate({
      conversationId: activeConversation,
      content: message,
      imageUrl: pendingImageUrl || undefined,
    });
    setMessage('');
    setPendingImageUrl(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUploaded = (url: string) => {
    setPendingImageUrl(url);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    addReaction.mutate({ messageId, emoji });
  };

  const currentConversation = conversations.find((c) => c.id === activeConversation);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (activeConversation && !conversationId) {
                setActiveConversation(undefined);
              } else {
                navigate(-1);
              }
            }}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {currentConversation ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {currentConversation.salon_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold text-foreground">
                  {currentConversation.salon_name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {isTyping ? 'Typing...' : 'Typically replies within a few hours'}
                </p>
              </div>
            </div>
          ) : (
            <h1 className="font-semibold text-foreground">Messages</h1>
          )}
        </div>
      </header>

      {/* Content */}
      {!activeConversation ? (
        // Conversation list
        <div className="flex-1 overflow-auto pb-20">
          {conversationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                No messages yet
              </h2>
              <p className="text-muted-foreground text-sm max-w-xs">
                Start a conversation with a salon after making a booking
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConversation(conv.id);
                    navigate(`/chat/${conv.id}`);
                  }}
                  className="w-full px-4 py-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {conv.salon_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unread_count && conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1">
                        {conv.unread_count > 99 ? '99+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`font-medium truncate ${conv.unread_count && conv.unread_count > 0 ? 'text-foreground font-semibold' : 'text-foreground'}`}>
                        {conv.salon_name}
                      </h3>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(conv.last_message_at), 'MMM d')}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${conv.unread_count && conv.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {conv.unread_count && conv.unread_count > 0 
                        ? `${conv.unread_count} new message${conv.unread_count > 1 ? 's' : ''}`
                        : 'Tap to view conversation'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Chat view
        <>
          <ScrollArea className="flex-1 px-4 py-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground text-sm">
                  Send a message to start the conversation
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const reactions = getMessageReactions(msg.id);
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${
                        msg.sender_type === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="group relative">
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                            msg.sender_type === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted text-foreground rounded-bl-md'
                          }`}
                        >
                          {msg.image_url && (
                            <img
                              src={msg.image_url}
                              alt="Attachment"
                              className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setPreviewImage(msg.image_url!)}
                            />
                          )}
                          {msg.content && msg.content !== '📷 Image' && (
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          )}
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <p
                              className={`text-xs ${
                                msg.sender_type === 'user'
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {format(new Date(msg.created_at), 'h:mm a')}
                            </p>
                          </div>
                          {/* Read receipt for user messages */}
                          {msg.sender_type === 'user' && (
                            <ReadReceipt
                              senderType={msg.sender_type}
                              readAt={msg.read_at}
                              createdAt={msg.created_at}
                            />
                          )}
                        </div>
                        
                        {/* Emoji reaction button */}
                        <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${
                          msg.sender_type === 'user' ? '-left-8' : '-right-8'
                        }`}>
                          <EmojiPicker
                            onSelect={(emoji) => handleReaction(msg.id, emoji)}
                          />
                        </div>
                      </div>
                      
                      {/* Reactions display */}
                      <MessageReactions
                        reactions={reactions}
                        onReact={(emoji) => handleReaction(msg.id, emoji)}
                      />
                    </motion.div>
                  );
                })}
                {isTyping && <TypingIndicator />}
                <div ref={scrollRef} />
              </div>
            )}
          </ScrollArea>

          {/* Pending image preview */}
          {pendingImageUrl && (
            <div className="px-4 py-2 border-t border-border bg-muted/50">
              <div className="relative inline-block">
                <img
                  src={pendingImageUrl}
                  alt="Pending attachment"
                  className="h-16 w-16 object-cover rounded-lg border border-border"
                />
                <button
                  onClick={() => setPendingImageUrl(null)}
                  className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Message input */}
          <div className="sticky bottom-0 bg-card border-t border-border p-4">
            <div className="flex items-center gap-2">
              <ChatImageUpload
                onImageUploaded={handleImageUploaded}
                disabled={sendMessage.isPending}
              />
              <Input
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  // Broadcast typing status
                  if (activeConversation) {
                    broadcastTyping(activeConversation, true);
                    // Clear previous timeout
                    if (typingTimeoutRef.current) {
                      clearTimeout(typingTimeoutRef.current);
                    }
                    // Set timeout to stop typing indicator after 2 seconds of no input
                    typingTimeoutRef.current = setTimeout(() => {
                      broadcastTyping(activeConversation, false);
                    }, 2000);
                  }
                }}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1"
                disabled={sendMessage.isPending}
              />
              <Button
                onClick={handleSend}
                disabled={(!message.trim() && !pendingImageUrl) || sendMessage.isPending}
                size="icon"
                className="shrink-0"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chat;
