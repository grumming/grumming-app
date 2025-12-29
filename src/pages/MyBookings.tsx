import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Calendar, Clock, MapPin, 
  Loader2, AlertCircle, CheckCircle2, XCircle, Star, CreditCard, MessageCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ReviewDialog } from '@/components/ReviewDialog';
import { BookingPaymentSheet } from '@/components/BookingPaymentSheet';

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
}

const MyBookings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);

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
      .order('booking_date', { ascending: true });

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

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    setCancellingId(selectedBooking.id);
    
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', selectedBooking.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel booking',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Booking Cancelled',
        description: 'Your appointment has been cancelled.',
      });
      fetchBookings();
    }
    
    setCancellingId(null);
    setShowCancelDialog(false);
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
          <TabsList className="w-full grid grid-cols-2 mb-6">
            <TabsTrigger value="upcoming" className="gap-2">
              <Calendar className="w-4 h-4" />
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Past ({pastBookings.length})
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
                                disabled={cancellingId === booking.id}
                              >
                                {cancellingId === booking.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Cancel'
                                )}
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
        </Tabs>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your appointment at{' '}
              <strong>{selectedBooking?.salon_name}</strong> on{' '}
              <strong>
                {selectedBooking && format(parseISO(selectedBooking.booking_date), 'MMM d, yyyy')}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
            Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  );
};

export default MyBookings;
