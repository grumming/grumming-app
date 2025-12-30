import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Store, Calendar, Clock, Star, Users, TrendingUp,
  Package, MessageSquare, Settings, Bell, Loader2, AlertTriangle,
  CheckCircle, XCircle, Eye, Edit2, ChevronRight, IndianRupee,
  Send, Reply, Plus, Trash2
} from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSalonOwner } from '@/hooks/useSalonOwner';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, isToday, isTomorrow, parseISO } from 'date-fns';
import SalonOwnerBottomNav from '@/components/SalonOwnerBottomNav';
import BookingManagement from '@/components/owner/BookingManagement';
import SalonOwnerBookingListener from '@/components/owner/SalonOwnerBookingListener';

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
  const { user } = useAuth();
  const { isSalonOwner, ownedSalons, isLoading: isOwnerLoading } = useSalonOwner();

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

  // Salon edit state
  const [isEditSalonDialogOpen, setIsEditSalonDialogOpen] = useState(false);
  const [isSubmittingSalon, setIsSubmittingSalon] = useState(false);
  const [salonForm, setSalonForm] = useState({
    name: '',
    description: '',
    location: '',
    city: '',
    phone: '',
    email: '',
    opening_time: '09:00',
    closing_time: '21:00'
  });

  // Select first salon by default
  useEffect(() => {
    if (ownedSalons.length > 0 && !selectedSalonId) {
      const primarySalon = ownedSalons.find(s => s.is_primary) || ownedSalons[0];
      setSelectedSalonId(primarySalon.id);
    }
  }, [ownedSalons, selectedSalonId]);

  // Fetch salon details and data
  useEffect(() => {
    const fetchSalonData = async () => {
      if (!selectedSalonId) return;

      setIsLoading(true);

      try {
        // Fetch salon details
        const { data: salonData } = await supabase
          .from('salons')
          .select('*')
          .eq('id', selectedSalonId)
          .single();

        if (salonData) {
          setSelectedSalon(salonData);
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

        setBookings(bookingsData || []);

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

      setIsLoading(false);
    };

    fetchSalonData();
  }, [selectedSalonId]);

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Booking ${newStatus}` });
      // Refresh bookings
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('salon_name', selectedSalon?.name)
        .order('booking_date', { ascending: false });
      setBookings(data || []);
    }
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

  // Salon edit handlers
  const handleOpenEditSalon = () => {
    if (!selectedSalon) return;
    setSalonForm({
      name: selectedSalon.name || '',
      description: selectedSalon.description || '',
      location: selectedSalon.location || '',
      city: selectedSalon.city || '',
      phone: selectedSalon.phone || '',
      email: selectedSalon.email || '',
      opening_time: selectedSalon.opening_time?.slice(0, 5) || '09:00',
      closing_time: selectedSalon.closing_time?.slice(0, 5) || '21:00'
    });
    setIsEditSalonDialogOpen(true);
  };

  const handleSaveSalon = async () => {
    if (!selectedSalonId || !salonForm.name.trim() || !salonForm.location.trim() || !salonForm.city.trim()) {
      toast({ title: 'Error', description: 'Name, location, and city are required', variant: 'destructive' });
      return;
    }

    setIsSubmittingSalon(true);

    try {
      const { error } = await supabase
        .from('salons')
        .update({
          name: salonForm.name.trim(),
          description: salonForm.description.trim() || null,
          location: salonForm.location.trim(),
          city: salonForm.city.trim(),
          phone: salonForm.phone.trim() || null,
          email: salonForm.email.trim() || null,
          opening_time: salonForm.opening_time,
          closing_time: salonForm.closing_time
        })
        .eq('id', selectedSalonId);

      if (error) throw error;

      // Update local state
      setSelectedSalon({
        ...selectedSalon,
        name: salonForm.name.trim(),
        description: salonForm.description.trim() || null,
        location: salonForm.location.trim(),
        city: salonForm.city.trim(),
        phone: salonForm.phone.trim() || null,
        email: salonForm.email.trim() || null,
        opening_time: salonForm.opening_time,
        closing_time: salonForm.closing_time
      });

      toast({ title: 'Success', description: 'Salon details updated successfully' });
      setIsEditSalonDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }

    setIsSubmittingSalon(false);
  };

  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

  const handleToggleVisibility = async () => {
    if (!selectedSalonId || !selectedSalon) return;

    setIsTogglingVisibility(true);

    try {
      const newStatus = !selectedSalon.is_active;
      const { error } = await supabase
        .from('salons')
        .update({ is_active: newStatus })
        .eq('id', selectedSalonId);

      if (error) throw error;

      setSelectedSalon({ ...selectedSalon, is_active: newStatus });
      toast({ 
        title: newStatus ? 'Salon Visible' : 'Salon Hidden', 
        description: newStatus 
          ? 'Your salon is now visible to customers' 
          : 'Your salon is now hidden from customers'
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }

    setIsTogglingVisibility(false);
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

  // Not a salon owner - show option to register
  if (!isSalonOwner || ownedSalons.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Store className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Salon Registered</h2>
            <p className="text-muted-foreground mb-4">
              You haven't registered a salon yet. List your salon to start receiving bookings.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/salon-registration')}>
                <Store className="w-4 h-4 mr-2" />
                Register Your Salon
              </Button>
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
            <div>
              <h1 className="font-display text-xl font-bold">Salon Dashboard</h1>
              <p className="text-xs text-muted-foreground">Manage your salon</p>
            </div>

            {/* Salon Selector */}
            {ownedSalons.length > 1 && (
              <Select value={selectedSalonId || ''} onValueChange={setSelectedSalonId}>
                <SelectTrigger className="w-[200px]">
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
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24">
        {/* Rejected Banner with Re-apply */}
        {selectedSalon && selectedSalon.status === 'rejected' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100 text-sm">
                  Registration Not Approved
                </h3>
                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                  Your salon registration was not approved.
                </p>
                {selectedSalon.rejection_reason && (
                  <div className="mt-2 p-2 bg-red-100/50 dark:bg-red-900/30 rounded-md">
                    <p className="text-xs text-red-800 dark:text-red-200">
                      <span className="font-medium">Reason:</span> {selectedSalon.rejection_reason}
                    </p>
                  </div>
                )}
                <Button 
                  size="sm" 
                  variant="outline"
                  className="mt-3 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
                  onClick={() => navigate(`/salon-registration?edit=${selectedSalon.id}`)}
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                  Edit & Resubmit
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Pending Approval Banner */}
        {selectedSalon && selectedSalon.status === 'pending' && (
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
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Salon Header Card */}
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

              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.todayBookings}</p>
                        <p className="text-xs text-muted-foreground">Today</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.upcomingBookings}</p>
                        <p className="text-xs text-muted-foreground">Upcoming</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.completedBookings}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <IndianRupee className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Today's Bookings */}
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
                        .map(booking => (
                          <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div>
                              <p className="font-medium">{booking.service_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {booking.booking_time} • ₹{booking.service_price}
                              </p>
                            </div>
                            <Badge variant={
                              booking.status === 'completed' ? 'default' :
                              booking.status === 'cancelled' ? 'destructive' : 'secondary'
                            }>
                              {booking.status}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="space-y-4">
              {selectedSalonId && selectedSalon && (
                <BookingManagement 
                  salonId={selectedSalonId} 
                  salonName={selectedSalon.name} 
                />
              )}
            </TabsContent>

            {/* Services Tab */}
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

            {/* Reviews Tab */}
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

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Salon Settings</CardTitle>
                      <CardDescription>Manage your salon information</CardDescription>
                    </div>
                    <Button onClick={handleOpenEditSalon}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Details
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Salon Visibility</p>
                        <Badge variant={selectedSalon?.is_active ? 'default' : 'secondary'}>
                          {selectedSalon?.is_active ? 'Visible' : 'Hidden'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedSalon?.is_active 
                          ? 'Your salon is visible to customers and can receive bookings' 
                          : 'Your salon is hidden from search results and listings'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isTogglingVisibility && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      <Switch
                        checked={selectedSalon?.is_active || false}
                        onCheckedChange={handleToggleVisibility}
                        disabled={isTogglingVisibility || selectedSalon?.status !== 'approved'}
                      />
                    </div>
                  </div>
                  
                  {selectedSalon?.status !== 'approved' && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 px-4">
                      Note: Visibility can only be toggled after your salon is approved by an admin.
                    </p>
                  )}

                  <div className="p-4 border rounded-lg space-y-3">
                    <p className="font-medium">Salon Details</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p>{selectedSalon?.name || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p>{selectedSalon?.location}, {selectedSalon?.city}</p>
                      </div>
                      {selectedSalon?.description && (
                        <div className="col-span-full">
                          <p className="text-muted-foreground">Description</p>
                          <p>{selectedSalon.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg space-y-3">
                    <p className="font-medium">Contact Information</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p>{selectedSalon?.phone || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p>{selectedSalon?.email || 'Not set'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg space-y-3">
                    <p className="font-medium">Business Hours</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Opens</p>
                        <p>{selectedSalon?.opening_time?.slice(0, 5) || '09:00'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Closes</p>
                        <p>{selectedSalon?.closing_time?.slice(0, 5) || '21:00'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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

      {/* Edit Salon Dialog */}
      <Dialog open={isEditSalonDialogOpen} onOpenChange={setIsEditSalonDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Salon Details</DialogTitle>
            <DialogDescription>
              Update your salon information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Salon Name *</Label>
              <Input
                value={salonForm.name}
                onChange={(e) => setSalonForm({ ...salonForm, name: e.target.value })}
                placeholder="e.g., Premium Cuts"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={salonForm.description}
                onChange={(e) => setSalonForm({ ...salonForm, description: e.target.value })}
                placeholder="Tell customers about your salon..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location/Address *</Label>
                <Input
                  value={salonForm.location}
                  onChange={(e) => setSalonForm({ ...salonForm, location: e.target.value })}
                  placeholder="e.g., 123 Main Street"
                />
              </div>
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  value={salonForm.city}
                  onChange={(e) => setSalonForm({ ...salonForm, city: e.target.value })}
                  placeholder="e.g., Mumbai"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={salonForm.phone}
                  onChange={(e) => setSalonForm({ ...salonForm, phone: e.target.value })}
                  placeholder="e.g., +91 98765 43210"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={salonForm.email}
                  onChange={(e) => setSalonForm({ ...salonForm, email: e.target.value })}
                  placeholder="e.g., salon@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Opening Time</Label>
                <Select 
                  value={salonForm.opening_time} 
                  onValueChange={(v) => setSalonForm({ ...salonForm, opening_time: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 13 }, (_, i) => i + 6).map(hour => (
                      <SelectItem key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                        {hour.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Closing Time</Label>
                <Select 
                  value={salonForm.closing_time} 
                  onValueChange={(v) => setSalonForm({ ...salonForm, closing_time: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 13 }, (_, i) => i + 12).map(hour => (
                      <SelectItem key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                        {hour.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSalonDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSalon} 
              disabled={isSubmittingSalon || !salonForm.name.trim() || !salonForm.location.trim() || !salonForm.city.trim()}
            >
              {isSubmittingSalon && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Real-time Booking Listener */}
      <SalonOwnerBookingListener />

      {/* Salon Owner Bottom Navigation */}
      <SalonOwnerBottomNav />
    </div>
  );
};

export default SalonDashboard;