import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, XCircle, MessageSquare, Calendar, Clock,
  User, Phone, Loader2, ChevronDown, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isToday, isTomorrow, isPast, startOfDay } from 'date-fns';

interface BookingWithCustomer {
  id: string;
  user_id: string;
  salon_name: string;
  salon_id: string | null;
  service_name: string;
  service_price: number;
  booking_date: string;
  booking_time: string;
  status: string;
  created_at: string;
  customer?: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
}

interface BookingManagementProps {
  salonId: string;
  salonName: string;
}

const BookingManagement = ({ salonId, salonName }: BookingManagementProps) => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingWithCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  
  // Message dialog state
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithCustomer | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Fetch bookings with customer info
  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);

      try {
        // Fetch bookings for this salon
        const { data: bookingsData, error } = await supabase
          .from('bookings')
          .select('*')
          .or(`salon_id.eq.${salonId},salon_name.eq.${salonName}`)
          .order('booking_date', { ascending: false })
          .order('booking_time', { ascending: false });

        if (error) throw error;

        // Fetch customer profiles
        const userIds = [...new Set(bookingsData?.map(b => b.user_id) || [])];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone, avatar_url')
          .in('user_id', userIds);

        // Combine bookings with customer data
        const bookingsWithCustomers = bookingsData?.map(booking => ({
          ...booking,
          customer: profiles?.find(p => p.user_id === booking.user_id)
        })) || [];

        setBookings(bookingsWithCustomers);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        toast({ title: 'Error', description: 'Failed to load bookings', variant: 'destructive' });
      }

      setIsLoading(false);
    };

    fetchBookings();
  }, [salonId, salonName, toast]);

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    setUpdatingBookingId(bookingId);

    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Booking marked as ${newStatus}` });
      setBookings(bookings.map(b => 
        b.id === bookingId ? { ...b, status: newStatus } : b
      ));
    }

    setUpdatingBookingId(null);
  };

  const handleOpenMessage = (booking: BookingWithCustomer) => {
    setSelectedBooking(booking);
    setMessageText('');
    setIsMessageDialogOpen(true);
  };

  const handleSendMessage = async () => {
    if (!selectedBooking || !messageText.trim()) return;

    setIsSendingMessage(true);

    try {
      // Check if conversation exists
      let { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('salon_id', salonId)
        .eq('user_id', selectedBooking.user_id)
        .maybeSingle();

      // Create conversation if it doesn't exist
      if (!conversation) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            salon_id: salonId,
            salon_name: salonName,
            user_id: selectedBooking.user_id,
            booking_id: selectedBooking.id
          })
          .select()
          .single();

        if (convError) throw convError;
        conversation = newConv;
      }

      // Send message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_type: 'salon',
          content: messageText.trim()
        });

      if (msgError) throw msgError;

      toast({ title: 'Message Sent', description: 'Your message has been sent to the customer' });
      setIsMessageDialogOpen(false);
      setSelectedBooking(null);
      setMessageText('');
    } catch (err: any) {
      console.error('Error sending message:', err);
      toast({ title: 'Error', description: err.message || 'Failed to send message', variant: 'destructive' });
    }

    setIsSendingMessage(false);
  };

  const getBookingDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      case 'upcoming': return 'secondary';
      default: return 'outline';
    }
  };

  // Filter and group bookings
  const filteredBookings = bookings.filter(b => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      b.service_name.toLowerCase().includes(query) ||
      b.customer?.full_name?.toLowerCase().includes(query) ||
      b.customer?.phone?.includes(query)
    );
  });

  const today = startOfDay(new Date());
  const upcomingBookings = filteredBookings.filter(b => 
    b.status === 'upcoming' && !isPast(parseISO(b.booking_date))
  );
  const todayBookings = filteredBookings.filter(b => isToday(parseISO(b.booking_date)));
  const pastBookings = filteredBookings.filter(b => 
    isPast(parseISO(b.booking_date)) && !isToday(parseISO(b.booking_date))
  );

  const renderBookingCard = (booking: BookingWithCustomer) => (
    <motion.div
      key={booking.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 border rounded-lg space-y-3"
    >
      {/* Customer Info */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={booking.customer?.avatar_url || undefined} />
            <AvatarFallback>
              {booking.customer?.full_name?.charAt(0) || 'C'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">
              {booking.customer?.full_name || 'Customer'}
            </p>
            {booking.customer?.phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {booking.customer.phone}
              </p>
            )}
          </div>
        </div>
        <Badge variant={getStatusBadgeVariant(booking.status)}>
          {booking.status}
        </Badge>
      </div>

      {/* Booking Details */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-medium">{booking.service_name}</span>
          <span className="font-semibold text-primary">₹{booking.service_price}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {getBookingDateLabel(booking.booking_date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {booking.booking_time}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => handleOpenMessage(booking)}
        >
          <MessageSquare className="w-4 h-4 mr-1.5" />
          Message
        </Button>

        {booking.status === 'upcoming' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() => handleUpdateStatus(booking.id, 'completed')}
              disabled={updatingBookingId === booking.id}
            >
              {updatingBookingId === booking.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Complete
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
              disabled={updatingBookingId === booking.id}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Booking Management</CardTitle>
              <CardDescription>
                {bookings.length} total booking{bookings.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by service or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No bookings match your search' : 'No bookings yet'}
              </p>
            </div>
          ) : (
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upcoming">
                  Upcoming ({upcomingBookings.length})
                </TabsTrigger>
                <TabsTrigger value="today">
                  Today ({todayBookings.length})
                </TabsTrigger>
                <TabsTrigger value="past">
                  Past ({pastBookings.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="mt-4 space-y-3">
                {upcomingBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No upcoming bookings</p>
                ) : (
                  upcomingBookings.map(renderBookingCard)
                )}
              </TabsContent>

              <TabsContent value="today" className="mt-4 space-y-3">
                {todayBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No bookings today</p>
                ) : (
                  todayBookings.map(renderBookingCard)
                )}
              </TabsContent>

              <TabsContent value="past" className="mt-4 space-y-3">
                {pastBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No past bookings</p>
                ) : (
                  pastBookings.slice(0, 20).map(renderBookingCard)
                )}
                {pastBookings.length > 20 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Showing last 20 past bookings
                  </p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Message Customer</DialogTitle>
            <DialogDescription>
              Send a message to {selectedBooking?.customer?.full_name || 'the customer'}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              {/* Booking context */}
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium">{selectedBooking.service_name}</p>
                <p className="text-muted-foreground">
                  {getBookingDateLabel(selectedBooking.booking_date)} at {selectedBooking.booking_time}
                </p>
              </div>

              {/* Message input */}
              <div className="space-y-2">
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {messageText.length}/500
                </p>
              </div>

              {/* Quick replies */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Quick messages:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Your appointment is confirmed!',
                    'Running 10 mins late, apologies!',
                    'Please arrive 5 mins early',
                    'Looking forward to seeing you!'
                  ].map((msg) => (
                    <Button
                      key={msg}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setMessageText(msg)}
                    >
                      {msg.slice(0, 25)}...
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendMessage} 
              disabled={isSendingMessage || !messageText.trim()}
            >
              {isSendingMessage && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BookingManagement;
