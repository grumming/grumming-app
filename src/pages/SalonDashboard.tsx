import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Store, Calendar, Clock, Star, Users, TrendingUp,
  Package, MessageSquare, Settings, Bell, Loader2, AlertTriangle,
  CheckCircle, XCircle, Eye, Edit2, ChevronRight, ChevronLeft, IndianRupee,
  Send, Reply, Plus, Trash2, LogOut, User, HelpCircle, RefreshCw, KeyRound,
  Scissors, Award, Upload, X
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
import { format, subDays, isToday, isTomorrow, parseISO, isBefore, parse, addDays } from 'date-fns';
import SalonOwnerBottomNav from '@/components/SalonOwnerBottomNav';
import SalonSettingsDialog from '@/components/SalonSettingsDialog';
import SalonOwnerChatDialog from '@/components/SalonOwnerChatDialog';
import { SalonEarnings } from '@/components/SalonEarnings';
import { SalonBankAccountManager } from '@/components/SalonBankAccountManager';
import SalonPayoutRequest from '@/components/SalonPayoutRequest';
import { SalonPayoutHistory } from '@/components/SalonPayoutHistory';
import { PayoutNotificationCenter } from '@/components/PayoutNotificationCenter';
import { StylistScheduleManager } from '@/components/StylistScheduleManager';

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

interface Stylist {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  specialties: string[] | null;
  experience_years: number | null;
  rating: number | null;
  total_reviews: number | null;
  is_available: boolean;
}

const SalonDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { isSalonOwner, ownedSalons, hasOwnership, isLoading: isOwnerLoading } = useSalonOwner();

  // Get active tab from URL params
  const searchParams = new URLSearchParams(location.search);
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(urlTab || 'bookings');

  // Sync activeTab with URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['overview', 'bookings', 'earnings', 'manage'].includes(tab)) {
      setActiveTab(tab);
    } else if (!tab) {
      setActiveTab('bookings');
    }
  }, [location.search]);

  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);
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

  // Stylist management state
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [isStylistDialogOpen, setIsStylistDialogOpen] = useState(false);
  const [editingStylist, setEditingStylist] = useState<Stylist | null>(null);
  const [stylistForm, setStylistForm] = useState({
    name: '',
    bio: '',
    experience_years: '1',
    specialties: ''
  });
  const [isSubmittingStylist, setIsSubmittingStylist] = useState(false);
  const [deleteStylistId, setDeleteStylistId] = useState<string | null>(null);
  const [stylistPhotoFile, setStylistPhotoFile] = useState<File | null>(null);
  const [stylistPhotoPreview, setStylistPhotoPreview] = useState<string | null>(null);
  const [isUploadingStylistPhoto, setIsUploadingStylistPhoto] = useState(false);
  const stylistPhotoInputRef = useRef<HTMLInputElement>(null);

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

  // Restore/Reschedule confirmation dialog state
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [selectedBookingForRestore, setSelectedBookingForRestore] = useState<Booking | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleTime, setRescheduleTime] = useState<string>('');

  // Cancel confirmation dialog state
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Pagination state for past bookings
  const [pastPage, setPastPage] = useState(1);
  const PAST_PER_PAGE = 10;
  const [pastFilter, setPastFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

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

      // Fetch stylists
      const { data: stylistsData } = await supabase
        .from('stylists')
        .select('*')
        .eq('salon_id', selectedSalonId)
        .order('name');

      setStylists(stylistsData || []);

      // Fetch bookings for this salon - query by salon_id for reliability
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .eq('salon_id', selectedSalonId)
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

  const parseBookingDateTime = (dateStr: string, timeStr: string) => {
    const raw = `${dateStr} ${timeStr}`.trim();
    const formats = ['yyyy-MM-dd HH:mm:ss', 'yyyy-MM-dd HH:mm', 'yyyy-MM-dd h:mm a'] as const;

    for (const fmt of formats) {
      try {
        const dt = parse(raw, fmt, new Date());
        if (!isNaN(dt.getTime())) return dt;
      } catch {
        // ignore
      }
    }

    // Fallback: date only
    return parseISO(dateStr);
  };

  // Restore booking handler (with optional reschedule)
  const handleRestoreBooking = async (withReschedule = false) => {
    if (!selectedBookingForRestore) return;

    setIsRestoring(true);

    const bookingDateTime = parseBookingDateTime(
      selectedBookingForRestore.booking_date,
      selectedBookingForRestore.booking_time
    );
    const isPastBooking = isBefore(bookingDateTime, new Date()) || isNaN(bookingDateTime.getTime());

    if (isPastBooking && !withReschedule) {
      setIsRescheduling(true);
      if (!rescheduleDate) setRescheduleDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
      if (!rescheduleTime) setRescheduleTime('10:00:00');

      setIsRestoring(false);
      toast({
        title: 'Reschedule required',
        description: 'This booking is in the past. Please choose a new date and time.',
        variant: 'destructive',
      });
      return;
    }

    const oldDate = selectedBookingForRestore.booking_date;
    const oldTime = selectedBookingForRestore.booking_time;

    const updateData: { status: string; booking_date?: string; booking_time?: string } = {
      status: 'upcoming',
    };

    if (withReschedule && rescheduleDate && rescheduleTime) {
      updateData.booking_date = rescheduleDate;
      updateData.booking_time = rescheduleTime;
    }

    console.log('[restore/reschedule] attempt', {
      booking_id: selectedBookingForRestore.id,
      withReschedule,
      updateData,
      old: { date: oldDate, time: oldTime },
    });

    const { data: updatedRows, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', selectedBookingForRestore.id)
      .select('id, status, booking_date, booking_time');

    console.log('[restore/reschedule] result', { updatedRows, error });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setIsRestoring(false);
      return;
    }

    if (!updatedRows || updatedRows.length === 0) {
      toast({
        title: 'Could not update booking',
        description: 'No changes were applied. This is usually a permissions issue.',
        variant: 'destructive',
      });
      setIsRestoring(false);
      return;
    }

    toast({
      title: 'Success',
      description: withReschedule
        ? `Booking rescheduled to ${updateData.booking_date} at ${updateData.booking_time}`
        : 'Booking restored to upcoming',
    });

    // Send notification to customer if rescheduled
    if (withReschedule && rescheduleDate && rescheduleTime) {
      try {
        await supabase.functions.invoke('send-reschedule-notification', {
          body: {
            booking_id: selectedBookingForRestore.id,
            user_id: selectedBookingForRestore.user_id,
            salon_name: selectedBookingForRestore.salon_name,
            service_name: selectedBookingForRestore.service_name,
            old_date: oldDate,
            old_time: oldTime,
            new_date: rescheduleDate,
            new_time: rescheduleTime,
          },
        });
      } catch (notifError) {
        console.error('Failed to send reschedule notification:', notifError);
      }
    }

    await fetchSalonData(false);

    setIsRestoring(false);
    setIsRestoreDialogOpen(false);
    setSelectedBookingForRestore(null);
    setIsRescheduling(false);
    setRescheduleDate('');
    setRescheduleTime('');
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

  // Stylist handlers
  const handleOpenAddStylist = () => {
    setEditingStylist(null);
    setStylistForm({ name: '', bio: '', experience_years: '1', specialties: '' });
    setStylistPhotoFile(null);
    setStylistPhotoPreview(null);
    setIsStylistDialogOpen(true);
  };

  const handleOpenEditStylist = (stylist: Stylist) => {
    setEditingStylist(stylist);
    setStylistForm({
      name: stylist.name,
      bio: stylist.bio || '',
      experience_years: stylist.experience_years?.toString() || '1',
      specialties: stylist.specialties?.join(', ') || ''
    });
    setStylistPhotoFile(null);
    setStylistPhotoPreview(stylist.photo_url);
    setIsStylistDialogOpen(true);
  };

  const handleStylistPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    setStylistPhotoFile(file);
    setStylistPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemoveStylistPhoto = () => {
    setStylistPhotoFile(null);
    setStylistPhotoPreview(null);
    if (stylistPhotoInputRef.current) {
      stylistPhotoInputRef.current.value = '';
    }
  };

  const handleToggleStylistAvailability = async (stylistId: string, currentAvailability: boolean) => {
    const { error } = await supabase
      .from('stylists')
      .update({ is_available: !currentAvailability })
      .eq('id', stylistId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setStylists(stylists.map(s => 
        s.id === stylistId ? { ...s, is_available: !currentAvailability } : s
      ));
    }
  };

  const handleSaveStylist = async () => {
    if (!selectedSalonId || !stylistForm.name.trim()) {
      toast({ title: 'Error', description: 'Stylist name is required', variant: 'destructive' });
      return;
    }

    setIsSubmittingStylist(true);

    try {
      let photoUrl: string | null = editingStylist?.photo_url || null;

      // Upload photo if a new file is selected
      if (stylistPhotoFile) {
        setIsUploadingStylistPhoto(true);
        const fileExt = stylistPhotoFile.name.split('.').pop();
        const fileName = `${selectedSalonId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('salon-images')
          .upload(`stylists/${fileName}`, stylistPhotoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('salon-images')
          .getPublicUrl(`stylists/${fileName}`);

        photoUrl = urlData.publicUrl;
        setIsUploadingStylistPhoto(false);
      } else if (!stylistPhotoPreview && editingStylist?.photo_url) {
        // Photo was removed
        photoUrl = null;
      }

      const specialtiesArray = stylistForm.specialties
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const stylistData = {
        salon_id: selectedSalonId,
        name: stylistForm.name.trim(),
        bio: stylistForm.bio.trim() || null,
        experience_years: parseInt(stylistForm.experience_years) || 1,
        specialties: specialtiesArray.length > 0 ? specialtiesArray : null,
        photo_url: photoUrl
      };

      if (editingStylist) {
        const { data, error } = await supabase
          .from('stylists')
          .update(stylistData)
          .eq('id', editingStylist.id)
          .select()
          .single();

        if (error) throw error;
        setStylists(stylists.map(s => s.id === editingStylist.id ? { ...s, ...data } : s));
        toast({ title: 'Success', description: 'Stylist updated' });
      } else {
        const { data, error } = await supabase
          .from('stylists')
          .insert({ ...stylistData, is_available: true })
          .select()
          .single();

        if (error) throw error;
        setStylists([...stylists, data]);
        toast({ title: 'Success', description: 'Stylist added' });
      }

      setIsStylistDialogOpen(false);
      setEditingStylist(null);
      setStylistPhotoFile(null);
      setStylistPhotoPreview(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setIsUploadingStylistPhoto(false);
    }

    setIsSubmittingStylist(false);
  };

  const handleDeleteStylist = async () => {
    if (!deleteStylistId) return;

    const { error } = await supabase
      .from('stylists')
      .delete()
      .eq('id', deleteStylistId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setStylists(stylists.filter(s => s.id !== deleteStylistId));
      toast({ title: 'Success', description: 'Stylist removed' });
    }

    setDeleteStylistId(null);
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
            {/* Only show tabs when not on Overview or Manage (accessed via bottom nav) */}
            {activeTab !== 'overview' && activeTab !== 'manage' && (
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="earnings">Earnings</TabsTrigger>
              </TabsList>
            )}

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveTab('bookings');
                  navigate('/salon-dashboard?tab=bookings');
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground -ml-2 mb-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>

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
                <TabsList className="grid w-full grid-cols-2 mb-4 h-auto p-1.5 bg-muted/60 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm">
                  <TabsTrigger 
                    value="upcoming" 
                    className="relative flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary data-[state=active]:border-primary/20 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/80"
                  >
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Upcoming</span>
                    {bookings.filter(b => b.status === 'upcoming').length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 text-[11px] font-bold rounded-full bg-primary/15 text-primary border border-primary/20">
                        {bookings.filter(b => b.status === 'upcoming').length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="past" 
                    className="relative flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/80"
                  >
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>Past</span>
                    {bookings.filter(b => b.status === 'completed' || b.status === 'cancelled').length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 text-[11px] font-bold rounded-full bg-muted text-muted-foreground border border-border/50">
                        {bookings.filter(b => b.status === 'completed' || b.status === 'cancelled').length}
                      </span>
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
                          {bookings
                            .filter(b => b.status === 'upcoming')
                            .sort((a, b) => {
                              const dateCompare = a.booking_date.localeCompare(b.booking_date);
                              if (dateCompare !== 0) return dateCompare;
                              return a.booking_time.localeCompare(b.booking_time);
                            })
                            .map(booking => (
                            <motion.div
                              key={booking.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center justify-between p-4 border rounded-lg bg-muted/20"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{booking.service_name}</p>
                                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Upcoming
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <User className="w-3 h-3" /> {booking.customer_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {getBookingDateLabel(booking.booking_date)} at {booking.booking_time}
                                </p>
                                <p className="text-sm font-medium mt-1">
                                  <span className="font-sans">₹</span>{booking.service_price}
                                </p>
                              </div>
                              
                              <div className="flex gap-2 flex-wrap justify-end">
                                <Button 
                                  size="icon"
                                  variant="ghost"
                                  className="relative h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/30 text-primary transition-all duration-200"
                                  onClick={() => {
                                    setSelectedBookingForChat(booking);
                                    setIsChatDialogOpen(true);
                                  }}
                                >
                                  <MessageSquare className="w-4 h-4" />
                                  {booking.unread_count && booking.unread_count > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 ring-2 ring-background">
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

                {/* Past Bookings (Completed + Cancelled) */}
                <TabsContent value="past">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <CardTitle>Past Bookings</CardTitle>
                          <CardDescription>Completed and cancelled appointments</CardDescription>
                        </div>
                        <Select
                          value={pastFilter}
                          onValueChange={(value: 'all' | 'completed' | 'cancelled') => {
                            setPastFilter(value);
                            setPastPage(1);
                          }}
                        >
                          <SelectTrigger className="w-[160px] h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              <span className="flex items-center gap-2">
                                All
                                <span className="text-xs text-muted-foreground">
                                  ({bookings.filter(b => b.status === 'completed' || b.status === 'cancelled').length})
                                </span>
                              </span>
                            </SelectItem>
                            <SelectItem value="completed">
                              <span className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                Completed
                                <span className="text-xs text-muted-foreground">
                                  ({bookings.filter(b => b.status === 'completed').length})
                                </span>
                              </span>
                            </SelectItem>
                            <SelectItem value="cancelled">
                              <span className="flex items-center gap-2">
                                <XCircle className="w-3.5 h-3.5 text-destructive" />
                                Cancelled
                                <span className="text-xs text-muted-foreground">
                                  ({bookings.filter(b => b.status === 'cancelled').length})
                                </span>
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const pastBookings = bookings
                          .filter(b => {
                            if (pastFilter === 'all') return b.status === 'completed' || b.status === 'cancelled';
                            return b.status === pastFilter;
                          })
                          .sort((a, b) => {
                            const dateCompare = b.booking_date.localeCompare(a.booking_date);
                            if (dateCompare !== 0) return dateCompare;
                            return b.booking_time.localeCompare(a.booking_time);
                          });
                        
                        const totalPast = pastBookings.length;
                        const totalPages = Math.ceil(totalPast / PAST_PER_PAGE);
                        const startIndex = (pastPage - 1) * PAST_PER_PAGE;
                        const paginatedBookings = pastBookings.slice(startIndex, startIndex + PAST_PER_PAGE);
                        
                        if (totalPast === 0) {
                          return (
                            <p className="text-center text-muted-foreground py-8">
                              {pastFilter === 'all' ? 'No past bookings yet' : 
                               pastFilter === 'completed' ? 'No completed bookings yet' : 'No cancelled bookings'}
                            </p>
                          );
                        }
                        
                        return (
                          <>
                            <div className="space-y-3">
                              {paginatedBookings.map(booking => {
                                const isCompleted = booking.status === 'completed';
                                const bookingDateTime = parseBookingDateTime(
                                  booking.booking_date,
                                  booking.booking_time
                                );
                                const isPastBooking =
                                  isBefore(bookingDateTime, new Date()) ||
                                  isNaN(bookingDateTime.getTime());

                                return (
                                  <motion.div
                                    key={booking.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center justify-between p-4 border rounded-lg bg-muted/20"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium">{booking.service_name}</p>
                                        {isCompleted ? (
                                          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Completed
                                          </Badge>
                                        ) : (
                                          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
                                            <XCircle className="w-3 h-3 mr-1" />
                                            Cancelled
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                        <User className="w-3 h-3" /> {booking.customer_name}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {getBookingDateLabel(booking.booking_date)} at {booking.booking_time}
                                      </p>
                                      <p className="text-sm font-medium mt-1">
                                        <span className="font-sans">₹</span>{booking.service_price}
                                      </p>
                                    </div>
                                    
                                    <div className="flex gap-2 flex-wrap justify-end">
                                      <Button 
                                        size="icon"
                                        variant="ghost"
                                        className="relative h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/30 text-primary transition-all duration-200"
                                        onClick={() => {
                                          setSelectedBookingForChat(booking);
                                          setIsChatDialogOpen(true);
                                        }}
                                      >
                                        <MessageSquare className="w-4 h-4" />
                                      </Button>
                                      {/* Only show Restore button for cancelled bookings with future date/time */}
                                      {!isCompleted && !isPastBooking && (
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="text-primary hover:text-primary"
                                          onClick={() => {
                                            setSelectedBookingForRestore(booking);
                                            setIsRescheduling(false);
                                            setRescheduleDate('');
                                            setRescheduleTime('');
                                            setIsRestoreDialogOpen(true);
                                          }}
                                        >
                                          <RefreshCw className="w-4 h-4 mr-1" />
                                          Restore
                                        </Button>
                                      )}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                            
                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                <p className="text-sm text-muted-foreground">
                                  Showing {startIndex + 1}-{Math.min(startIndex + PAST_PER_PAGE, totalPast)} of {totalPast}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPastPage(p => Math.max(1, p - 1))}
                                    disabled={pastPage === 1}
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </Button>
                                  <span className="text-sm font-medium px-2">
                                    {pastPage} / {totalPages}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPastPage(p => Math.min(totalPages, p + 1))}
                                    disabled={pastPage === totalPages}
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Manage Tab - with nested tabs for Reviews, Services, Stylists, Schedule, Bank Account */}
            <TabsContent value="manage" className="space-y-4">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveTab('bookings');
                  navigate('/salon-dashboard?tab=bookings');
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground -ml-2 mb-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>

              <Tabs defaultValue="services" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 bg-muted/50">
                  <TabsTrigger value="services" className="text-xs sm:text-sm">Services</TabsTrigger>
                  <TabsTrigger value="stylists" className="text-xs sm:text-sm">Team</TabsTrigger>
                  <TabsTrigger value="schedule" className="text-xs sm:text-sm">Schedule</TabsTrigger>
                  <TabsTrigger value="bank" className="text-xs sm:text-sm">Bank</TabsTrigger>
                </TabsList>

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

                {/* Stylists Sub-Tab */}
                <TabsContent value="stylists" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Team Members</CardTitle>
                          <CardDescription>Manage your salon stylists</CardDescription>
                        </div>
                        <Button onClick={handleOpenAddStylist}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Stylist
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {stylists.length === 0 ? (
                        <div className="text-center py-12">
                          <Scissors className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                          <h3 className="font-medium">No stylists yet</h3>
                          <p className="text-sm text-muted-foreground mt-1 mb-4">
                            Add stylists to showcase your team
                          </p>
                          <Button onClick={handleOpenAddStylist}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Your First Stylist
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {stylists.map(stylist => (
                            <motion.div 
                              key={stylist.id} 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <Avatar className="w-12 h-12">
                                  <AvatarImage src={stylist.photo_url || ''} />
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {stylist.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{stylist.name}</p>
                                    {!stylist.is_available && (
                                      <Badge variant="secondary">Unavailable</Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    {stylist.experience_years && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Award className="w-3 h-3" />
                                        {stylist.experience_years} yr{stylist.experience_years > 1 ? 's' : ''} exp
                                      </span>
                                    )}
                                    {stylist.rating && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                        {stylist.rating.toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                  {stylist.specialties && stylist.specialties.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {stylist.specialties.slice(0, 3).map((spec, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                          {spec}
                                        </Badge>
                                      ))}
                                      {stylist.specialties.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{stylist.specialties.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 mr-2">
                                  <Switch
                                    checked={stylist.is_available}
                                    onCheckedChange={() => handleToggleStylistAvailability(stylist.id, stylist.is_available)}
                                  />
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleOpenEditStylist(stylist)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteStylistId(stylist.id)}
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

                {/* Schedule Sub-Tab */}
                <TabsContent value="schedule" className="space-y-4">
                  {selectedSalonId && (
                    <StylistScheduleManager
                      salonId={selectedSalonId}
                      stylists={stylists.map(s => ({
                        id: s.id,
                        name: s.name,
                        photo_url: s.photo_url,
                      }))}
                    />
                  )}
                </TabsContent>

                {/* Bank Account Sub-Tab */}
                <TabsContent value="bank" className="space-y-4">
                  {selectedSalonId && selectedSalon && (
                    <SalonBankAccountManager
                      salonId={selectedSalonId}
                      salonName={selectedSalon.name}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Earnings Tab */}
            <TabsContent value="earnings" className="space-y-6">
              {selectedSalonId && selectedSalon && (
                <Tabs defaultValue="overview" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="request">Request Payout</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview">
                    <SalonEarnings 
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

      {/* Add/Edit Stylist Dialog */}
      <Dialog open={isStylistDialogOpen} onOpenChange={setIsStylistDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-primary" />
              {editingStylist ? 'Edit Stylist' : 'Add New Stylist'}
            </DialogTitle>
            <DialogDescription>
              {editingStylist ? 'Update the stylist details' : 'Add a new team member to your salon'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Photo Upload Section */}
            <div className="space-y-2">
              <Label>Profile Photo</Label>
              <div className="flex items-center gap-4">
                {stylistPhotoPreview ? (
                  <div className="relative">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={stylistPhotoPreview} alt="Stylist photo" />
                      <AvatarFallback>{stylistForm.name?.charAt(0) || 'S'}</AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={handleRemoveStylistPhoto}
                      className="absolute -top-1 -right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => stylistPhotoInputRef.current?.click()}
                  >
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={stylistPhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleStylistPhotoSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => stylistPhotoInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {stylistPhotoPreview ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max 5MB. JPG, PNG, WebP
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Stylist Name *</Label>
              <Input
                value={stylistForm.name}
                onChange={(e) => setStylistForm({ ...stylistForm, name: e.target.value })}
                placeholder="e.g., Rahul Kumar"
              />
            </div>

            <div className="space-y-2">
              <Label>Bio / Description</Label>
              <Textarea
                value={stylistForm.bio}
                onChange={(e) => setStylistForm({ ...stylistForm, bio: e.target.value })}
                placeholder="Brief description of the stylist's expertise..."
                rows={3}
                maxLength={300}
              />
            </div>

            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Select 
                value={stylistForm.experience_years} 
                onValueChange={(v) => setStylistForm({ ...stylistForm, experience_years: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 year</SelectItem>
                  <SelectItem value="2">2 years</SelectItem>
                  <SelectItem value="3">3 years</SelectItem>
                  <SelectItem value="5">5 years</SelectItem>
                  <SelectItem value="7">7 years</SelectItem>
                  <SelectItem value="10">10+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Specialties</Label>
              <Input
                value={stylistForm.specialties}
                onChange={(e) => setStylistForm({ ...stylistForm, specialties: e.target.value })}
                placeholder="e.g., Haircuts, Beard, Hair Color"
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple specialties with commas
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStylistDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStylist} disabled={isSubmittingStylist || !stylistForm.name.trim()}>
              {isSubmittingStylist && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingStylist ? 'Save Changes' : 'Add Stylist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Stylist Confirmation */}
      <Dialog open={!!deleteStylistId} onOpenChange={() => setDeleteStylistId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Stylist</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this stylist? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteStylistId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteStylist}>
              Remove
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

      {/* Restore/Reschedule Booking Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={(open) => {
        setIsRestoreDialogOpen(open);
        if (!open) {
          setSelectedBookingForRestore(null);
          setIsRescheduling(false);
          setRescheduleDate('');
          setRescheduleTime('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              {isRescheduling ? 'Reschedule Booking' : 'Restore Booking'}
            </DialogTitle>
            <DialogDescription>
              {isRescheduling 
                ? 'Choose a new date and time for this booking.'
                : 'Restore this booking to its original schedule or reschedule to a new date.'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBookingForRestore && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="font-medium">{selectedBookingForRestore.service_name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <User className="w-3 h-3" /> {selectedBookingForRestore.customer_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Original: {getBookingDateLabel(selectedBookingForRestore.booking_date)} at {selectedBookingForRestore.booking_time}
                </p>
                <p className="text-sm font-medium">₹{selectedBookingForRestore.service_price}</p>
              </div>
              
              {/* Reschedule toggle for future bookings */}
              {(() => {
                 const bookingDateTime = parseBookingDateTime(
                   selectedBookingForRestore.booking_date,
                   selectedBookingForRestore.booking_time
                 );
                 const isPastBooking =
                   isBefore(bookingDateTime, new Date()) || isNaN(bookingDateTime.getTime());
                
                return (
                  <>
                    {!isPastBooking && (
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="reschedule-toggle"
                          checked={isRescheduling}
                          onCheckedChange={(checked) => {
                            setIsRescheduling(checked);
                            if (checked) {
                              setRescheduleDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
                              setRescheduleTime('10:00:00');
                            } else {
                              setRescheduleDate('');
                              setRescheduleTime('');
                            }
                          }}
                        />
                        <Label htmlFor="reschedule-toggle" className="text-sm">
                          Reschedule to a different date
                        </Label>
                      </div>
                    )}
                    
                    {isPastBooking && (
                      <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          Original date has passed. Please select a new date and time.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
              
              {isRescheduling && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="reschedule-date">New Date</Label>
                    <Input
                      id="reschedule-date"
                      type="date"
                      value={rescheduleDate}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reschedule-time">New Time</Label>
                    <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                      <SelectTrigger id="reschedule-time">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {['09:00:00', '09:30:00', '10:00:00', '10:30:00', '11:00:00', '11:30:00', 
                          '12:00:00', '12:30:00', '13:00:00', '13:30:00', '14:00:00', '14:30:00',
                          '15:00:00', '15:30:00', '16:00:00', '16:30:00', '17:00:00', '17:30:00',
                          '18:00:00', '18:30:00', '19:00:00', '19:30:00', '20:00:00', '20:30:00'].map(time => (
                          <SelectItem key={time} value={time}>
                            {format(parse(time, 'HH:mm:ss', new Date()), 'h:mm a')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsRestoreDialogOpen(false);
                setSelectedBookingForRestore(null);
                setIsRescheduling(false);
                setRescheduleDate('');
                setRescheduleTime('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleRestoreBooking(isRescheduling)} 
              disabled={isRestoring || (isRescheduling && (!rescheduleDate || !rescheduleTime))}
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isRescheduling ? 'Rescheduling...' : 'Restoring...'}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {isRescheduling ? 'Reschedule Booking' : 'Restore Booking'}
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