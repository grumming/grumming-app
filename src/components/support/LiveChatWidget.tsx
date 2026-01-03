import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const quickResponses = [
  'How do I cancel a booking?',
  'Where is my refund?',
  'How to contact salon?',
  'Payment issues',
];

const botResponses: Record<string, string> = {
  'how do i cancel a booking?':
    'To cancel a booking, go to "My Bookings" in your profile, find the appointment you want to cancel, and tap "Cancel". Note that a 20% cancellation fee applies.',
  'where is my refund?':
    'Refunds are processed within 24-48 hours. Check your wallet balance in the app. If you paid via UPI/card and haven\'t received your refund after 48 hours, please submit a support ticket.',
  'how to contact salon?':
    'You can chat with the salon directly through the "Chat" button on your booking details. The salon will receive your message and respond as soon as possible.',
  'payment issues':
    'For payment issues, try refreshing and retrying. If the problem persists, check your payment method or try a different one. For failed payments where money was deducted, it will be auto-refunded within 5-7 business days.',
  default:
    'Thanks for your message! For detailed help, please submit a support ticket above and our team will respond within 24 hours. You can also reach us on WhatsApp for urgent issues.',
};

export const LiveChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hi! 👋 I\'m Grumming\'s support assistant. How can I help you today?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const lowerText = messageText.toLowerCase();
      let response = botResponses.default;

      for (const [key, value] of Object.entries(botResponses)) {
        if (key !== 'default' && lowerText.includes(key.replace('?', ''))) {
          response = value;
          break;
        }
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
              <Bot className="h-5 w-5" />
              <CardTitle className="text-base font-medium">Support Chat</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-72 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-2',
                      message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarFallback
                        className={cn(
                          message.sender === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {message.sender === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        'rounded-lg px-3 py-2 max-w-[80%] text-sm',
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-muted">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Quick Responses */}
            <div className="px-4 pb-2">
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

            {/* Input */}
            <div className="p-3 border-t flex gap-2">
              <Input
                placeholder="Type a message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTyping}
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
