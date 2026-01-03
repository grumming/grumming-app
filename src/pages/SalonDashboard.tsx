import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Store, Calendar, Clock, Star, Users, TrendingUp,
  Package, MessageSquare, Settings, Bell, Loader2, AlertTriangle,
  CheckCircle, XCircle, Eye, Edit2, ChevronRight, IndianRupee,
  Send, Reply, Plus, Trash2, LogOut, User, HelpCircle, RefreshCw, KeyRound
} from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSalonOwner } from '@/hooks/useSalonOwner';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, isToday, isTomorrow, parseISO, isBefore, parse } from 'date-fns';
import SalonOwnerBottomNav from '@/components/SalonOwnerBottomNav';
import SalonSettingsDialog from '@/components/SalonSettingsDialog';
import SalonOwnerChatDialog from '@/components/SalonOwnerChatDialog';
import { SalonEarnings } from '@/components/SalonEarnings';
import { SalonBankAccountManager } from '@/components/SalonBankAccountManager';
import SalonPayoutRequest from '@/components/SalonPayoutRequest';
import { SalonPayoutHistory } from '@/components/SalonPayoutHistory';
import { PayoutNotificationCenter } from '@/components/PayoutNotificationCenter';

interface Booking {
  id: string;
  user_id: string;
  salon_name: string;
  service_name: string;
  service_price: number;
  booking_date: string;
  booking_time: string;
  status: string;
  created_at: string;
  completion_pin?: string;
  customer_name?: string;
  customer_phone?: string;
  unread_count?: number;
}

interface SalonService {
  id: string;
  name: string;
  price: number;
  duration: string;
  category: string;
  is_active: boolean;
}

interface Review {
  id: string;
  user_id: string;
  salon_id: string;
  booking_id: string | null;
  rating: number;
  review_text: string | null;
  owner_response: string | null;
  owner_response_at: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface DashboardStats {
  todayBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  totalRevenue: number;
  avgRating: number;
  totalReviews: number;
}

const SalonDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { isSalonOwner, ownedSalons, hasOwnership, isLoading: isOwnerLoading } = useSalonOwner();

  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSalon, setSelectedSalon] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<SalonService[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    avgRating: 4.5,
    totalReviews: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Review response state
  const [isRespondDialogOpen, setIsRespondDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  // Service management state
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<SalonService | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    price: '49',
    duration: '30 min',
    category: 'Haircut'
  });
  const [isSubmittingService, setIsSubmittingService] = useState(false);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);

  // Settings dialog state
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  // Description editor state
  const [salonDescription, setSalonDescription] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  // Business hours editor state
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('21:00');
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [isSavingHours, setIsSavingHours] = useState(false);

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const pullStartY = useRef(0);

  // PIN verification state for completing bookings
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [selectedBookingForPin, setSelectedBookingForPin] = useState<Booking | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [isPinVerifying, setIsPinVerifying] = useState(false);

  // Chat dialog state
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [selectedBookingForChat, setSelectedBookingForChat] = useState<Booking | null>(null);

  // Restore confirmation dialog state
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [selectedBookingForRestore, setSelectedBookingForRestore] = useState<Booking | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Cancel confirmation dialog state
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 80;

  // Select first salon by default and show welcome toast
  useEffect(() => {
    if (ownedSalons.length > 0 && !selectedSalonId) {
      const primarySalon = ownedSalons.find(s => s.is_primary) || ownedSalons[0];
      setSelectedSalonId(primarySalon.id);
      
      // Check for welcome back toast
      const welcomeSalonName = localStorage.getItem('welcomeBackSalon');
      if (welcomeSalonName) {
        localStorage.removeItem('welcomeBackSalon');
        toast({
          title: `Welcome back, ${welcomeSalonName}! 👋`,
          description: "Your dashboard is ready.",
        });
      }
    }
  }, [ownedSalons, selectedSalonId, toast]);

  // Fetch salon details and data
  const fetchSalonData = useCallback(async (showLoadingSpinner = true) => {
    if (!selectedSalonId) return;

    if (showLoadingSpinner) setIsLoading(true);

    try {
      // Fetch salon details
      const { data: salonData } = await supabase
        .from('salons')
        .select('*')
        .eq('id', selectedSalonId)
        .single();

      if (salonData) {
        setSelectedSalon(salonData);
        setSalonDescription(salonData.description || '');
      }

      // Fetch services
      const { data: servicesData } = await supabase
        .from('salon_services')
        .select('*')
        .eq('salon_id', selectedSalonId)
        .order('category');

      setServices(servicesData || []);

      // Fetch bookings for this salon
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .eq('salon_name', salonData?.name)
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false });

      // Fetch customer profiles for bookings
      const customerIds = bookingsData?.map(b => b.user_id) || [];
      const { data: customerProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', customerIds);

      // Fetch conversations for bookings to get unread message counts
      const bookingIds = bookingsData?.map(b => b.id) || [];
      const { data: conversationsData } = await supabase
        .from('conversations')
        .select('id, booking_id')
        .in('booking_id', bookingIds);

      // Fetch unread message counts for each conversation
      const conversationIds = conversationsData?.map(c => c.id) || [];
      let unreadCounts: Record<string, number> = {};
      
      if (conversationIds.length > 0) {
        const { data: unreadMessages } = await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', conversationIds)
          .eq('sender_type', 'user')
          .eq('is_read', false);

        // Count unread messages per conversation
        unreadMessages?.forEach(msg => {
          unreadCounts[msg.conversation_id] = (unreadCounts[msg.conversation_id] || 0) + 1;
        });
      }

      // Map conversation unread counts to booking ids
      const bookingUnreadCounts: Record<string, number> = {};
      conversationsData?.forEach(conv => {
        if (conv.booking_id && unreadCounts[conv.id]) {
          bookingUnreadCounts[conv.booking_id] = unreadCounts[conv.id];
        }
      });

      // Attach customer info and unread counts to bookings
      const bookingsWithCustomers = bookingsData?.map(booking => ({
        ...booking,
        customer_name: customerProfiles?.find(p => p.user_id === booking.user_id)?.full_name || 'Customer',
        customer_phone: customerProfiles?.find(p => p.user_id === booking.user_id)?.phone || '',
        unread_count: bookingUnreadCounts[booking.id] || 0
      })) || [];

      setBookings(bookingsWithCustomers);

      // Calculate stats
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayBookings = (bookingsData || []).filter(b => b.booking_date === today);
      const upcomingBookings = (bookingsData || []).filter(b => b.status === 'upcoming');
      const completedBookings = (bookingsData || []).filter(b => b.status === 'completed');
      const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.service_price || 0), 0);

      // Fetch reviews with user profiles
      // Note: reviews.salon_id stores slug-style IDs, so we also check by salon name
      const salonSlug = salonData?.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*')
        .or(`salon_id.eq.${selectedSalonId},salon_id.ilike.${salonSlug}%`)
        .order('created_at', { ascending: false });

      // Fetch profiles for reviewers
      const reviewerIds = reviewsData?.map(r => r.user_id) || [];
      const { data: reviewerProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', reviewerIds);

      const reviewsWithProfiles = reviewsData?.map(review => ({
        ...review,
        profile: reviewerProfiles?.find(p => p.user_id === review.user_id)
      })) || [];

      setReviews(reviewsWithProfiles);

      const avgRating = reviewsData && reviewsData.length > 0
        ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
        : salonData?.rating || 4.5;

      setStats({
        todayBookings: todayBookings.length,
        upcomingBookings: upcomingBookings.length,
        completedBookings: completedBookings.length,
        totalRevenue,
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews: reviewsData?.length || 0
      });

    } catch (err) {
      console.error('Error fetching salon data:', err);
      toast({ title: 'Error', description: 'Failed to load salon data', variant: 'destructive' });
    }

    if (showLoadingSpinner) setIsLoading(false);
  }, [selectedSalonId, toast]);

  useEffect(() => {
    fetchSalonData();
  }, [fetchSalonData]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchSalonData(false);
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Dashboard data updated",
    });
  }, [fetchSalonData, toast]);

  // Touch event handlers for pull-to-refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      pullStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - pullStartY.current);
    
    // Apply resistance to the pull
    const resistedDistance = Math.min(distance * 0.5, PULL_THRESHOLD * 1.5);
    setPullDistance(resistedDistance);
  }, [isPulling, isRefreshing]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      handleRefresh();
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, isRefreshing, handleRefresh]);

  // Function to refresh salon data after settings update
  const handleSalonUpdated = async () => {
    if (!selectedSalonId) return;
    const { data: salonData } = await supabase
      .from('salons')
      .select('*')
      .eq('id', selectedSalonId)
      .single();

    if (salonData) {
      setSelectedSalon(salonData);
      setSalonDescription(salonData.description || '');
      setOpeningTime(salonData.opening_time || '09:00');
      setClosingTime(salonData.closing_time || '21:00');
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Booking ${newStatus}` });
      // Refresh bookings with customer info
      await fetchSalonData(false);
    }
  };

  // PIN verification handlers
  const handleOpenPinDialog = (booking: Booking) => {
    setSelectedBookingForPin(booking);
    setEnteredPin('');
    setIsPinDialogOpen(true);
  };

  const handleVerifyPin = async () => {
    if (!selectedBookingForPin) return;
    
    setIsPinVerifying(true);
    
    // Fetch the booking to check PIN
    const { data: bookingData, error: fetchError } = await supabase
      .from('bookings')
      .select('completion_pin')
      .eq('id', selectedBookingForPin.id)
      .single();

    if (fetchError || !bookingData) {
      toast({ title: 'Error', description: 'Could not verify PIN', variant: 'destructive' });
      setIsPinVerifying(false);
      return;
    }

    if (bookingData.completion_pin === enteredPin) {
      // PIN matches - complete the booking
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', selectedBookingForPin.id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Booking completed successfully!' });
        setIsPinDialogOpen(false);
        setSelectedBookingForPin(null);
        setEnteredPin('');
        await fetchSalonData(false);
      }
    } else {
      toast({ title: 'Invalid PIN', description: 'The PIN entered is incorrect. Ask customer for correct PIN.', variant: 'destructive' });
    }
    
    setIsPinVerifying(false);
  };

  // Restore booking handler
  const handleRestoreBooking = async () => {
    if (!selectedBookingForRestore) return;
    
    setIsRestoring(true);
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'upcoming' })
      .eq('id', selectedBookingForRestore.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Booking restored to upcoming' });
      await fetchSalonData(false);
    }
    
    setIsRestoring(false);
    setIsRestoreDialogOpen(false);
    setSelectedBookingForRestore(null);
  };

  // Cancel booking handler
  const handleCancelBooking = async () => {
    if (!selectedBookingForCancel) return;
    
    setIsCancelling(true);
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', selectedBookingForCancel.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Booking Cancelled', description: 'The booking has been cancelled' });
      await fetchSalonData(false);
    }
    
    setIsCancelling(false);
    setIsCancelDialogOpen(false);
    setSelectedBookingForCancel(null);
  };

  const handleToggleService = async (serviceId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('salon_services')
      .update({ is_active: !isActive })
      .eq('id', serviceId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setServices(services.map(s => 
        s.id === serviceId ? { ...s, is_active: !isActive } : s
      ));
    }
  };

  const getBookingDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  };

  const handleOpenResponseDialog = (review: Review) => {
    setSelectedReview(review);
    setResponseText(review.owner_response || '');
    setIsRespondDialogOpen(true);
  };

  // Service management handlers
  const handleOpenAddService = () => {
    setEditingService(null);
    setServiceForm({ name: '', price: '49', duration: '30 min', category: 'Haircut' });
    setIsServiceDialogOpen(true);
  };

  const handleOpenEditService = (service: SalonService) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      price: service.price.toString(),
      duration: service.duration,
      category: service.category
    });
    setIsServiceDialogOpen(true);
  };

  const handleSaveService = async () => {
    if (!serviceForm.name.trim() || !selectedSalonId) {
      toast({ title: 'Error', description: 'Service name is required', variant: 'destructive' });
      return;
    }

    setIsSubmittingService(true);

    try {
      if (editingService) {
        // Update existing service
        const { error } = await supabase
          .from('salon_services')
          .update({
            name: serviceForm.name.trim(),
            price: parseFloat(serviceForm.price) || 49,
            duration: serviceForm.duration,
            category: serviceForm.category
          })
          .eq('id', editingService.id);

        if (error) throw error;

        setServices(services.map(s => 
          s.id === editingService.id 
            ? { ...s, name: serviceForm.name.trim(), price: parseFloat(serviceForm.price) || 49, duration: serviceForm.duration, category: serviceForm.category }
            : s
        ));
        toast({ title: 'Success', description: 'Service updated successfully' });
      } else {
        // Add new service
        const { data, error } = await supabase
          .from('salon_services')
          .insert({
            salon_id: selectedSalonId,
            name: serviceForm.name.trim(),
            price: parseFloat(serviceForm.price) || 49,
            duration: serviceForm.duration,
            category: serviceForm.category,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;

        setServices([...services, data]);
        toast({ title: 'Success', description: 'Service added successfully' });
      }

      setIsServiceDialogOpen(false);
      setEditingService(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }

    setIsSubmittingService(false);
  };

  const handleDeleteService = async () => {
    if (!deleteServiceId) return;

    const { error } = await supabase
      .from('salon_services')
      .delete()
      .eq('id', deleteServiceId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setServices(services.filter(s => s.id !== deleteServiceId));
      toast({ title: 'Success', description: 'Service deleted' });
    }

    setDeleteServiceId(null);
  };

  const handleSubmitResponse = async () => {
    if (!selectedReview || !responseText.trim()) {
      toast({ title: 'Error', description: 'Please enter a response', variant: 'destructive' });
      return;
    }

    setIsSubmittingResponse(true);

    const { error } = await supabase
      .from('reviews')
      .update({
        owner_response: responseText.trim(),
        owner_response_at: new Date().toISOString()
      })
      .eq('id', selectedReview.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Response submitted successfully' });
      setReviews(reviews.map(r => 
        r.id === selectedReview.id 
          ? { ...r, owner_response: responseText.trim(), owner_response_at: new Date().toISOString() }
          : r
      ));
      setIsRespondDialogOpen(false);
      setSelectedReview(null);
      setResponseText('');
    }

    setIsSubmittingResponse(false);
  };

  const handleToggleVisibility = async (visible: boolean) => {
    if (!selectedSalonId) return;

    const { error } = await supabase
      .from('salons')
      .update({ is_active: visible })
      .eq('id', selectedSalonId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setSelectedSalon((prev: any) => prev ? { ...prev, is_active: visible } : null);
      toast({ 
        title: visible ? 'Salon Visible' : 'Salon Hidden', 
        description: visible 
          ? 'Your salon is now visible in search results' 
          : 'Your salon is hidden from customers'
      });
    }
  };

  const handleSaveDescription = async () => {
    if (!selectedSalonId) return;

    setIsSavingDescription(true);

    const { error } = await supabase
      .from('salons')
      .update({ description: salonDescription.trim() })
      .eq('id', selectedSalonId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setSelectedSalon((prev: any) => prev ? { ...prev, description: salonDescription.trim() } : null);
      setIsEditingDescription(false);
      toast({ title: 'Success', description: 'Salon description updated' });
    }

    setIsSavingDescription(false);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
      />
    ));
  };

  // Loading state
  if (isOwnerLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-4">Please log in to access the salon dashboard.</p>
            <Button onClick={() => navigate('/auth')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not a salon owner
  if (!isSalonOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Salon Access</h2>
            <p className="text-muted-foreground mb-4">
              You don't have any salons linked to your account. Contact support if you believe this is an error.
            </p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Salon partner account, but no salon created yet
  if (!hasOwnership) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Store className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Finish setting up your salon</h2>
            <p className="text-muted-foreground mb-4">
              You're signed in as a salon partner, but you haven't created a salon yet.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/salon-registration', { replace: true })}>
                Continue Registration
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ownership exists but salons couldn't be loaded
  if (ownedSalons.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Couldn't load your salon</h2>
            <p className="text-muted-foreground mb-4">
              We found your salon ownership, but couldn't load the salon details. Please try again.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.reload()}>Retry</Button>
              <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold">Salon Dashboard</h1>
                <p className="text-xs text-muted-foreground">Manage your salon</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Payout Notification Center */}
              <PayoutNotificationCenter />
              
              {/* Salon Selector */}
              {ownedSalons.length > 1 && (
                <Select value={selectedSalonId || ''} onValueChange={setSelectedSalonId}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select salon" />
                  </SelectTrigger>
                  <SelectContent>
                    {ownedSalons.map(salon => (
                      <SelectItem key={salon.id} value={salon.id}>
                        {salon.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Account Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all shadow-sm ring-2 ring-transparent hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-background"
                  >
                    <User className="h-5 w-5 text-primary-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 shadow-lg border-border/50">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-3">
                      {selectedSalon?.image_url ? (
                        <img 
                          src={selectedSalon.image_url} 
                          alt={selectedSalon.name} 
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center ring-2 ring-primary/20">
                          <Store className="h-5 w-5 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex flex-col space-y-0.5">
                        <p className="text-sm font-semibold leading-none truncate max-w-[170px]">
                          {selectedSalon?.name || 'My Salon'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground truncate max-w-[170px]">
                          {selectedSalon?.location}, {selectedSalon?.city?.split(',')[0]}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsSettingsDialogOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Salon Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/help')}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help & Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={async () => {
                      await signOut();
                      navigate('/');
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main 
        ref={containerRef}
        className="container mx-auto px-4 py-6 pb-24 overflow-auto relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateY(${pullDistance}px)`, transition: isPulling ? 'none' : 'transform 0.3s ease-out' }}
      >
        {/* Pull-to-refresh indicator */}
        <motion.div 
          className="absolute left-0 right-0 flex justify-center pointer-events-none z-10"
          style={{ 
            top: `${-40 + pullDistance * 0.5}px`,
            opacity: Math.min(pullDistance / PULL_THRESHOLD, 1)
          }}
        >
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-sm ${isRefreshing ? 'animate-pulse' : ''}`}>
            <RefreshCw className={`w-4 h-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`} 
              style={{ transform: `rotate(${pullDistance * 3}deg)` }}
            />
            <span className="text-xs font-medium text-primary">
              {isRefreshing ? 'Refreshing...' : pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </motion.div>

        {/* Pending Approval Banner */}
        {selectedSalon && !selectedSalon.is_active && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
                  Pending Approval
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Your salon is under review. You'll be notified once it's approved and visible to customers.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="manage">Manage</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Salon Header Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {selectedSalon?.image_url ? (
                          <img src={selectedSalon.image_url} alt={selectedSalon.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Store className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-semibold">{selectedSalon?.name}</h2>
                          <Badge variant={selectedSalon?.is_active ? 'default' : 'secondary'}>
                            {selectedSalon?.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {selectedSalon?.location}, {selectedSalon?.city}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            {stats.avgRating} ({stats.totalReviews} reviews)
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {selectedSalon?.opening_time?.slice(0, 5)} - {selectedSalon?.closing_time?.slice(0, 5)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: Calendar, color: 'primary', value: stats.todayBookings, label: 'Today' },
                  { icon: Clock, color: 'yellow', value: stats.upcomingBookings, label: 'Upcoming' },
                  { icon: CheckCircle, color: 'green', value: stats.completedBookings, label: 'Completed' },
                  { icon: IndianRupee, color: 'primary', value: `₹${stats.totalRevenue.toLocaleString()}`, label: 'Revenue' },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + index * 0.08, ease: "easeOut" }}
                  >
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            stat.color === 'primary' ? 'bg-primary/10' :
                            stat.color === 'yellow' ? 'bg-yellow-500/10' :
                            'bg-green-500/10'
                          }`}>
                            <stat.icon className={`w-5 h-5 ${
                              stat.color === 'primary' ? 'text-primary' :
                              stat.color === 'yellow' ? 'text-yellow-600' :
                              'text-green-600'
                            }`} />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Today's Bookings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Today's Bookings</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => document.querySelector<HTMLButtonElement>('[data-value="bookings"]')?.click()}>
                      View All <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {bookings.filter(b => b.booking_date === format(new Date(), 'yyyy-MM-dd')).length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No bookings today</p>
                    ) : (
                      <div className="space-y-3">
                        {bookings
                          .filter(b => b.booking_date === format(new Date(), 'yyyy-MM-dd'))
                          .slice(0, 5)
                          .map((booking, idx) => (
                            <motion.div
                              key={booking.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: 0.6 + idx * 0.05 }}
                              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{booking.service_name}</p>
                                  <Badge variant={
                                    booking.status === 'completed' ? 'default' :
                                    booking.status === 'cancelled' ? 'destructive' : 'secondary'
                                  }>
                                    {booking.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <User className="w-3 h-3" /> {booking.customer_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {booking.booking_time} • ₹{booking.service_price}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="space-y-4">
              <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="upcoming" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Upcoming
                    {bookings.filter(b => b.status === 'upcoming').length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {bookings.filter(b => b.status === 'upcoming').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Completed
                    {bookings.filter(b => b.status === 'completed').length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {bookings.filter(b => b.status === 'completed').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="cancelled" className="flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Cancelled
                    {bookings.filter(b => b.status === 'cancelled').length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {bookings.filter(b => b.status === 'cancelled').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Upcoming Bookings */}
                <TabsContent value="upcoming">
                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Bookings</CardTitle>
                      <CardDescription>Bookings awaiting service</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {bookings.filter(b => b.status === 'upcoming').length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No upcoming bookings</p>
                      ) : (
                        <div className="space-y-3">
                          {bookings.filter(b => b.status === 'upcoming').map(booking => (
                            <motion.div
                              key={booking.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center justify-between p-4 border rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{booking.service_name}</p>
                                  <Badge variant="secondary">{booking.status}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <User className="w-3 h-3" /> {booking.customer_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {getBookingDateLabel(booking.booking_date)} at {booking.booking_time}
                                </p>
                                <p className="text-sm font-medium mt-1">₹{booking.service_price}</p>
                              </div>
                              
                              <div className="flex gap-2 flex-wrap justify-end">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="relative"
                                  onClick={() => {
                                    setSelectedBookingForChat(booking);
                                    setIsChatDialogOpen(true);
                                  }}
                                >
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  Message
                                  {booking.unread_count && booking.unread_count > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                      {booking.unread_count > 9 ? '9+' : booking.unread_count}
                                    </span>
                                  )}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleOpenPinDialog(booking)}
                                >
                                  <KeyRound className="w-4 h-4 mr-1" />
                                  Complete
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setSelectedBookingForCancel(booking);
                                    setIsCancelDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Completed Bookings */}
                <TabsContent value="completed">
                  <Card>
                    <CardHeader>
                      <CardTitle>Completed Bookings</CardTitle>
                      <CardDescription>Successfully completed appointments</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {bookings.filter(b => b.status === 'completed').length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No completed bookings yet</p>
                      ) : (
                        <div className="space-y-3">
                          {bookings.filter(b => b.status === 'completed').map(booking => (
                            <motion.div
                              key={booking.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center justify-between p-4 border rounded-lg bg-muted/20"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{booking.service_name}</p>
                                  <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Completed
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <User className="w-3 h-3" /> {booking.customer_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {getBookingDateLabel(booking.booking_date)} at {booking.booking_time}
                                </p>
                                <p className="text-sm font-medium mt-1">₹{booking.service_price}</p>
                              </div>
                              
                              <div className="flex gap-2 flex-wrap justify-end">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="relative"
                                  onClick={() => {
                                    setSelectedBookingForChat(booking);
                                    setIsChatDialogOpen(true);
                                  }}
                                >
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  Message
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                {/* Cancelled Bookings */}
                <TabsContent value="cancelled">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cancelled Bookings</CardTitle>
                      <CardDescription>Bookings that were cancelled</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {bookings.filter(b => b.status === 'cancelled').length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No cancelled bookings</p>
                      ) : (
                        <div className="space-y-3">
                          {bookings.filter(b => b.status === 'cancelled').map(booking => (
                            <motion.div
                              key={booking.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center justify-between p-4 border rounded-lg bg-muted/20"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{booking.service_name}</p>
                                  <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Cancelled
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <User className="w-3 h-3" /> {booking.customer_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {getBookingDateLabel(booking.booking_date)} at {booking.booking_time}
                                </p>
                                <p className="text-sm font-medium mt-1">₹{booking.service_price}</p>
                              </div>
                              
                              <div className="flex gap-2 flex-wrap justify-end">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="relative"
                                  onClick={() => {
                                    setSelectedBookingForChat(booking);
                                    setIsChatDialogOpen(true);
                                  }}
                                >
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  Message
                                </Button>
                                {(() => {
                                  // Check if booking date+time has passed
                                  const bookingDateTime = parse(
                                    `${booking.booking_date} ${booking.booking_time}`,
                                    'yyyy-MM-dd HH:mm:ss',
                                    new Date()
                                  );
                                  const isPast = isBefore(bookingDateTime, new Date());
                                  
                                  return (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="text-primary hover:text-primary"
                                      disabled={isPast}
                                      onClick={() => {
                                        setSelectedBookingForRestore(booking);
                                        setIsRestoreDialogOpen(true);
                                      }}
                                      title={isPast ? 'Cannot restore past bookings' : 'Restore booking'}
                                    >
                                      <RefreshCw className="w-4 h-4 mr-1" />
                                      Restore
                                    </Button>
                                  );
                                })()}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Manage Tab - with nested tabs for Reviews, Services, Settings */}
            <TabsContent value="manage" className="space-y-4">
              <Tabs defaultValue="reviews" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                  <TabsTrigger value="reviews" className="text-sm">Reviews</TabsTrigger>
                  <TabsTrigger value="services" className="text-sm">Services</TabsTrigger>
                </TabsList>

                {/* Reviews Sub-Tab */}
                <TabsContent value="reviews" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Customer Reviews</CardTitle>
                          <CardDescription>View and respond to customer feedback</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{stats.avgRating}</span>
                          <span className="text-muted-foreground">({stats.totalReviews} reviews)</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {reviews.length === 0 ? (
                        <div className="text-center py-12">
                          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                          <h3 className="font-medium">No reviews yet</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Reviews from customers will appear here
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {reviews.map(review => (
                            <motion.div
                              key={review.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="p-4 border rounded-lg space-y-3"
                            >
                              {/* Review Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-10 h-10">
                                    <AvatarImage src={review.profile?.avatar_url || ''} />
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                      {review.profile?.full_name?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">
                                      {review.profile?.full_name || 'Customer'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(review.created_at), 'MMM d, yyyy')}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {renderStars(review.rating)}
                                </div>
                              </div>

                              {/* Review Text */}
                              {review.review_text && (
                                <p className="text-sm text-muted-foreground">
                                  "{review.review_text}"
                                </p>
                              )}

                              {/* Owner Response */}
                              {review.owner_response ? (
                                <div className="ml-4 p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Reply className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-medium">Your Response</span>
                                    <span className="text-xs text-muted-foreground">
                                      {review.owner_response_at && format(new Date(review.owner_response_at), 'MMM d, yyyy')}
                                    </span>
                                  </div>
                                  <p className="text-sm">{review.owner_response}</p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 h-7 text-xs"
                                    onClick={() => handleOpenResponseDialog(review)}
                                  >
                                    <Edit2 className="w-3 h-3 mr-1" />
                                    Edit Response
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenResponseDialog(review)}
                                >
                                  <Reply className="w-4 h-4 mr-2" />
                                  Respond to Review
                                </Button>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Services Sub-Tab */}
                <TabsContent value="services" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Services</CardTitle>
                          <CardDescription>Manage your salon services</CardDescription>
                        </div>
                        <Button onClick={handleOpenAddService}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Service
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {services.length === 0 ? (
                        <div className="text-center py-12">
                          <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                          <h3 className="font-medium">No services yet</h3>
                          <p className="text-sm text-muted-foreground mt-1 mb-4">
                            Add services to let customers know what you offer
                          </p>
                          <Button onClick={handleOpenAddService}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Your First Service
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {services.map(service => (
                            <motion.div 
                              key={service.id} 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{service.name}</p>
                                  <Badge variant="outline">{service.category}</Badge>
                                  {!service.is_active && (
                                    <Badge variant="secondary">Hidden</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  ₹{service.price} • {service.duration}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 mr-2">
                                  <Switch
                                    checked={service.is_active}
                                    onCheckedChange={() => handleToggleService(service.id, service.is_active)}
                                  />
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleOpenEditService(service)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteServiceId(service.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Earnings Tab */}
            <TabsContent value="earnings" className="space-y-6">
              {selectedSalonId && selectedSalon && (
                <Tabs defaultValue="overview" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="payouts">Payout History</TabsTrigger>
                    <TabsTrigger value="request">Request Payout</TabsTrigger>
                    <TabsTrigger value="bank">Bank Account</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview">
                    <SalonEarnings 
                      salonId={selectedSalonId} 
                      salonName={selectedSalon.name} 
                    />
                  </TabsContent>
                  
                  <TabsContent value="payouts">
                    <SalonPayoutHistory
                      salonId={selectedSalonId}
                      salonName={selectedSalon.name}
                    />
                  </TabsContent>
                  
                  <TabsContent value="request">
                    <SalonPayoutRequest
                      salonId={selectedSalonId}
                      salonName={selectedSalon.name}
                    />
                  </TabsContent>
                  
                  <TabsContent value="bank">
                    <SalonBankAccountManager
                      salonId={selectedSalonId}
                      salonName={selectedSalon.name}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Response Dialog */}
      <Dialog open={isRespondDialogOpen} onOpenChange={setIsRespondDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedReview?.owner_response ? 'Edit Response' : 'Respond to Review'}
            </DialogTitle>
            <DialogDescription>
              Your response will be visible to all customers viewing this review
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4">
              {/* Original Review */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    {renderStars(selectedReview.rating)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    by {selectedReview.profile?.full_name || 'Customer'}
                  </span>
                </div>
                {selectedReview.review_text && (
                  <p className="text-sm text-muted-foreground">"{selectedReview.review_text}"</p>
                )}
              </div>

              {/* Response Input */}
              <div className="space-y-2">
                <Label>Your Response</Label>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Thank you for your feedback..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {responseText.length}/500 characters
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRespondDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitResponse} disabled={isSubmittingResponse || !responseText.trim()}>
              {isSubmittingResponse && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Send className="w-4 h-4 mr-2" />
              Submit Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Service Dialog */}
      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Edit Service' : 'Add New Service'}
            </DialogTitle>
            <DialogDescription>
              {editingService ? 'Update the service details' : 'Add a new service to your salon'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                placeholder="e.g., Men's Haircut"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input
                  type="number"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select 
                  value={serviceForm.duration} 
                  onValueChange={(v) => setServiceForm({ ...serviceForm, duration: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15 min">15 min</SelectItem>
                    <SelectItem value="30 min">30 min</SelectItem>
                    <SelectItem value="45 min">45 min</SelectItem>
                    <SelectItem value="1 hour">1 hour</SelectItem>
                    <SelectItem value="1.5 hours">1.5 hours</SelectItem>
                    <SelectItem value="2 hours">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={serviceForm.category} 
                onValueChange={(v) => setServiceForm({ ...serviceForm, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Haircut">Haircut</SelectItem>
                  <SelectItem value="Beard">Beard</SelectItem>
                  <SelectItem value="Shave">Shave</SelectItem>
                  <SelectItem value="Hair Color">Hair Color</SelectItem>
                  <SelectItem value="Hair Treatment">Hair Treatment</SelectItem>
                  <SelectItem value="Facial">Facial</SelectItem>
                  <SelectItem value="Massage">Massage</SelectItem>
                  <SelectItem value="Combo">Combo</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsServiceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveService} disabled={isSubmittingService || !serviceForm.name.trim()}>
              {isSubmittingService && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingService ? 'Save Changes' : 'Add Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Service Confirmation */}
      <Dialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this service? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteServiceId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteService}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salon Settings Dialog */}
      <SalonSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        salon={selectedSalon}
        onSalonUpdated={handleSalonUpdated}
      />

      {/* PIN Verification Dialog */}
      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Enter Customer PIN
            </DialogTitle>
            <DialogDescription>
              Ask the customer for their 4-digit booking PIN to complete this appointment.
            </DialogDescription>
          </DialogHeader>
          
          {selectedBookingForPin && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
              <p className="font-medium">{selectedBookingForPin.service_name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> {selectedBookingForPin.customer_name}
              </p>
              <p className="text-sm text-muted-foreground">
                ₹{selectedBookingForPin.service_price}
              </p>
            </div>
          )}
          
          <div className="flex justify-center py-4">
            <InputOTP
              maxLength={4}
              value={enteredPin}
              onChange={(value) => setEnteredPin(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPinDialogOpen(false);
                setSelectedBookingForPin(null);
                setEnteredPin('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleVerifyPin} 
              disabled={enteredPin.length !== 4 || isPinVerifying}
            >
              {isPinVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify & Complete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog for messaging customers */}
      {selectedBookingForChat && selectedSalonId && (
        <SalonOwnerChatDialog
          open={isChatDialogOpen}
          onOpenChange={(open) => {
            setIsChatDialogOpen(open);
            if (!open) setSelectedBookingForChat(null);
          }}
          booking={{
            id: selectedBookingForChat.id,
            user_id: selectedBookingForChat.user_id,
            salon_name: selectedBookingForChat.salon_name,
            service_name: selectedBookingForChat.service_name,
            customer_name: selectedBookingForChat.customer_name,
          }}
          salonId={selectedSalonId}
          onMessagesRead={() => fetchSalonData(false)}
        />
      )}

      {/* Restore Booking Confirmation Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Restore Booking
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to restore this cancelled booking back to upcoming?
            </DialogDescription>
          </DialogHeader>
          
          {selectedBookingForRestore && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
              <p className="font-medium">{selectedBookingForRestore.service_name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> {selectedBookingForRestore.customer_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {getBookingDateLabel(selectedBookingForRestore.booking_date)} at {selectedBookingForRestore.booking_time}
              </p>
              <p className="text-sm font-medium">₹{selectedBookingForRestore.service_price}</p>
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsRestoreDialogOpen(false);
                setSelectedBookingForRestore(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRestoreBooking} 
              disabled={isRestoring}
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restore Booking
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Cancel Booking
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? The customer will be notified.
            </DialogDescription>
          </DialogHeader>
          
          {selectedBookingForCancel && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
              <p className="font-medium">{selectedBookingForCancel.service_name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> {selectedBookingForCancel.customer_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {getBookingDateLabel(selectedBookingForCancel.booking_date)} at {selectedBookingForCancel.booking_time}
              </p>
              <p className="text-sm font-medium">₹{selectedBookingForCancel.service_price}</p>
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCancelDialogOpen(false);
                setSelectedBookingForCancel(null);
              }}
            >
              Keep Booking
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCancelBooking} 
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Booking
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SalonOwnerBottomNav />
    </div>
  );
};

export default SalonDashboard;