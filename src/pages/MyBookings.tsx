import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Calendar, Clock, 
  Loader2, AlertCircle, CheckCircle2, Star, CreditCard, MessageCircle, Wallet, KeyRound, RefreshCw, Scissors 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ReviewDialog } from '@/components/ReviewDialog';
import { BookingPaymentSheet } from '@/components/BookingPaymentSheet';
import { BookingCancellationDialog } from '@/components/BookingCancellationDialog';
import { RefundStatusTracker } from '@/components/RefundStatusTracker';
import { BookingRescheduleDialog } from '@/components/BookingRescheduleDialog';

interface Booking {
  id: string;
  salon_name: string;
  service_name: string;
  service_price: number;
  booking_date: string;
  booking_time: string;
  status: string;
  created_at: string;
  has_review?: boolean;
  completion_pin?: string;
  payment_id?: string | null;
  payment_method?: string | null;
  stylist_id?: string | null;
  stylist_name?: string | null;
}

const MyBookings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Fetch bookings
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false })
      .order('booking_time', { ascending: false });

    if (bookingsError) {
      toast({
        title: 'Error',
        description: 'Failed to fetch bookings',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Fetch reviews to check which bookings have been reviewed
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('booking_id')
      .eq('user_id', user.id);

    const reviewedBookingIds = new Set(reviewsData?.map(r => r.booking_id) || []);

    // Mark bookings that have reviews
    const bookingsWithReviewStatus = (bookingsData || []).map(b => ({
      ...b,
      has_review: reviewedBookingIds.has(b.id),
    }));

    setBookings(bookingsWithReviewStatus);
    setLoading(false);
  };

  const handleCancellationComplete = () => {
    fetchBookings();
    setSelectedBooking(null);
  };

  const getStatusBadge = (status: string, bookingDate: string) => {
    const date = parseISO(bookingDate);
    
    if (status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (status === 'completed' || (status === 'upcoming' && isPast(date) && !isToday(date))) {
      return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
    }
    if (isToday(date)) {
      return <Badge className="bg-blue-500 hover:bg-blue-600">Today</Badge>;
    }
    return <Badge variant="secondary">Upcoming</Badge>;
  };

  const upcomingBookings = bookings.filter(b => {
    const date = parseISO(b.booking_date);
    return b.status === 'upcoming' && (!isPast(date) || isToday(date));
  });

  const pastBookings = bookings.filter(b => {
    const date = parseISO(b.booking_date);
    return b.status === 'completed' || b.status === 'cancelled' || (b.status === 'upcoming' && isPast(date) && !isToday(date));
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">My Bookings</h1>
        </div>
      </header>

      <div className="p-4">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="upcoming" className="gap-1 text-xs sm:text-sm">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Upcoming</span> ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-1 text-xs sm:text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">Past</span> ({pastBookings.length})
            </TabsTrigger>
            <TabsTrigger value="refunds" className="gap-1 text-xs sm:text-sm">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Refunds</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <AnimatePresence mode="popLayout">
              {upcomingBookings.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Upcoming Bookings</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have any scheduled appointments
                  </p>
                  <Button onClick={() => navigate('/')}>
                    Book Now
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {/* PIN Info Banner */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
                    <KeyRound className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-foreground">Completion PIN</p>
                      <p className="text-muted-foreground">Share your PIN with the salon to mark your appointment as complete.</p>
                    </div>
                  </div>
                  {upcomingBookings.map((booking, index) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{booking.salon_name}</h3>
                              <p className="text-sm text-muted-foreground">{booking.service_name}</p>
                              {booking.stylist_name && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <Scissors className="w-3 h-3" />
                                  <span>with {booking.stylist_name}</span>
                                </p>
                              )}
                            </div>
                            {getStatusBadge(booking.status, booking.booking_date)}
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{format(parseISO(booking.booking_date), 'EEE, MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{booking.booking_time}</span>
                            </div>
                            {booking.completion_pin && (
                              <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md">
                                <KeyRound className="w-4 h-4 text-primary" />
                                <span className="font-mono font-bold text-primary tracking-wider">
                                  {booking.completion_pin}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-border">
                            <span className="font-semibold text-lg text-primary">
                              ₹{booking.service_price}
                            </span>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const salonId = booking.salon_name.toLowerCase().replace(/\s+/g, '-');
                                  navigate(`/chat?bookingId=${booking.id}&salonId=${salonId}&salonName=${encodeURIComponent(booking.salon_name)}`);
                                }}
                                className="gap-1"
                              >
                                <MessageCircle className="w-4 h-4" />
                                Chat
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRescheduleBooking(booking);
                                  setShowRescheduleDialog(true);
                                }}
                                className="gap-1"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Reschedule
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setPaymentBooking(booking);
                                  setShowPaymentSheet(true);
                                }}
                                className="gap-1"
                              >
                                <CreditCard className="w-4 h-4" />
                                Pay
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setShowCancelDialog(true);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="past">
            <AnimatePresence mode="popLayout">
              {pastBookings.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Past Bookings</h3>
                  <p className="text-muted-foreground">
                    Your booking history will appear here
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {pastBookings.map((booking, index) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="overflow-hidden opacity-80">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{booking.salon_name}</h3>
                              <p className="text-sm text-muted-foreground">{booking.service_name}</p>
                              {booking.stylist_name && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <Scissors className="w-3 h-3" />
                                  <span>with {booking.stylist_name}</span>
                                </p>
                              )}
                            </div>
                            {getStatusBadge(booking.status, booking.booking_date)}
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{format(parseISO(booking.booking_date), 'EEE, MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{booking.booking_time}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-border">
                            <span className="font-semibold text-lg text-primary">
                              ₹{booking.service_price}
                            </span>
                            <div className="flex gap-2">
                              {booking.status !== 'cancelled' && !booking.has_review && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setReviewBooking(booking);
                                    setShowReviewDialog(true);
                                  }}
                                  className="gap-1"
                                >
                                  <Star className="w-4 h-4" />
                                  Review
                                </Button>
                              )}
                              {booking.status !== 'cancelled' && booking.has_review && (
                                <Badge variant="secondary" className="gap-1">
                                  <Star className="w-3 h-3 fill-primary text-primary" />
                                  Reviewed
                                </Badge>
                              )}
                              {booking.status !== 'cancelled' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate('/')}
                                >
                                  Book Again
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="refunds">
            {user && <RefundStatusTracker userId={user.id} />}
          </TabsContent>
        </Tabs>
      </div>

      {/* Cancellation Dialog with Refund Options */}
      {selectedBooking && (
        <BookingCancellationDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          booking={selectedBooking}
          onCancellationComplete={handleCancellationComplete}
        />
      )}

      {/* Review Dialog */}
      {reviewBooking && user && (
        <ReviewDialog
          open={showReviewDialog}
          onOpenChange={setShowReviewDialog}
          bookingId={reviewBooking.id}
          salonId={reviewBooking.salon_name.toLowerCase().replace(/\s+/g, '-')}
          salonName={reviewBooking.salon_name}
          userId={user.id}
          onReviewSubmitted={fetchBookings}
        />
      )}

      {/* Payment Sheet */}
      {paymentBooking && (
        <BookingPaymentSheet
          open={showPaymentSheet}
          onOpenChange={setShowPaymentSheet}
          booking={paymentBooking}
          customerPhone={user?.phone || undefined}
          onPaymentSuccess={fetchBookings}
        />
      )}

      {/* Reschedule Dialog */}
      {rescheduleBooking && user && (
        <BookingRescheduleDialog
          open={showRescheduleDialog}
          onOpenChange={setShowRescheduleDialog}
          booking={rescheduleBooking}
          userId={user.id}
          onRescheduleComplete={fetchBookings}
        />
      )}
    </div>
  );
};

export default MyBookings;
