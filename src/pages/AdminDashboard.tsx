import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Users, Calendar, Wallet, Tag, TrendingUp, 
  BarChart3, Clock, CheckCircle, XCircle, Loader2, 
  AlertTriangle, ChevronRight, Search, MoreVertical,
  Mail, Phone, UserCheck, UserX, Eye, RefreshCw, Store, Bell,
  CreditCard, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import AdminBookingListener from '@/components/AdminBookingListener';
import LiveActivityFeed from '@/components/LiveActivityFeed';
import RevenueAnalytics from '@/components/RevenueAnalytics';
import SalonManagement from '@/components/admin/SalonManagement';
import SalonOwnerManagement from '@/components/admin/SalonOwnerManagement';
import PendingSalonApprovals from '@/components/admin/PendingSalonApprovals';
import TestPhoneWhitelist from '@/components/admin/TestPhoneWhitelist';
import RefundManagement from '@/components/admin/RefundManagement';
import SupportTicketManagement from '@/components/admin/SupportTicketManagement';
import UserManagement from '@/components/admin/UserManagement';
import PromoCodeManagement from '@/components/admin/PromoCodeManagement';
import PaymentManagement from '@/components/admin/PaymentManagement';
import SalonPayoutManagement from '@/components/admin/SalonPayoutManagement';
import { CommissionReports } from '@/components/admin/CommissionReports';
import { SalonCommissionReport } from '@/components/admin/SalonCommissionReport';
import RecentUsers from '@/components/admin/RecentUsers';
import { getDisplayContact } from '@/utils/displayUtils';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  email_verified: boolean | null;
}

interface BookingStats {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  revenue: number;
}

interface DailyStats {
  date: string;
  bookings: number;
  revenue: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookingStats, setBookingStats] = useState<BookingStats>({
    total: 0, upcoming: 0, completed: 0, cancelled: 0, revenue: 0
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [walletStats, setWalletStats] = useState({ totalBalance: 0, totalEarned: 0, totalSpent: 0 });
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false);
  const [pendingSalonCount, setPendingSalonCount] = useState(0);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesData) {
        setUsers(profilesData);
        setUserCount(profilesData.length);
      }

      // Fetch booking stats
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('status, service_price, booking_date');
      
      if (bookingsData) {
        const stats: BookingStats = {
          total: bookingsData.length,
          upcoming: bookingsData.filter(b => b.status === 'upcoming').length,
          completed: bookingsData.filter(b => b.status === 'completed').length,
          cancelled: bookingsData.filter(b => b.status === 'cancelled').length,
          revenue: bookingsData
            .filter(b => b.status === 'completed')
            .reduce((sum, b) => sum + (b.service_price || 0), 0)
        };
        setBookingStats(stats);

        // Calculate daily stats for last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), 6 - i);
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayBookings = bookingsData.filter(b => b.booking_date === dateStr);
          return {
            date: format(date, 'EEE'),
            bookings: dayBookings.length,
            revenue: dayBookings
              .filter(b => b.status === 'completed')
              .reduce((sum, b) => sum + (b.service_price || 0), 0)
          };
        });
        setDailyStats(last7Days);
      }

      // Fetch wallet stats
      const { data: walletsData } = await supabase
        .from('wallets')
        .select('balance, total_earned, total_spent');
      
      if (walletsData) {
        setWalletStats({
          totalBalance: walletsData.reduce((sum, w) => sum + (w.balance || 0), 0),
          totalEarned: walletsData.reduce((sum, w) => sum + (w.total_earned || 0), 0),
          totalSpent: walletsData.reduce((sum, w) => sum + (w.total_spent || 0), 0)
        });
      }

      // Fetch pending salon count
      const { count: pendingCount } = await supabase
        .from('salons')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false);
      
      setPendingSalonCount(pendingCount || 0);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      toast({ title: 'Error', description: 'Failed to load dashboard data', variant: 'destructive' });
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
    }
  }, [isAdmin]);

  // Filter users based on search
  const filteredUsers = users.filter(u => {
    const searchLower = searchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower) ||
      u.phone?.includes(searchQuery)
    );
  });

  // View user details
  const handleViewUser = async (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setIsLoadingUserDetails(true);
    
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userProfile.user_id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    setUserBookings(bookings || []);
    setIsLoadingUserDetails(false);
  };

  // Stats card component
  const StatCard = ({ 
    title, value, subtitle, icon: Icon, trend, color = 'primary' 
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string; 
    icon: any; 
    trend?: string;
    color?: string;
  }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" />
                {trend}
              </p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-full bg-${color}/10 flex items-center justify-center`}>
            <Icon className={`w-5 h-5 text-${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Show loading while checking admin status
  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Access denied for non-admins
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-4">Please log in to access this page.</p>
            <Button onClick={() => navigate('/auth')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access the admin panel.
            </p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Real-time booking notifications */}
      <AdminBookingListener />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Analytics & User Management</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="payments">
                <CreditCard className="w-4 h-4 mr-1" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="payouts">
                <Building2 className="w-4 h-4 mr-1" />
                Payouts
              </TabsTrigger>
              <TabsTrigger value="salons" className="relative">
                Salons
                {pendingSalonCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
                  >
                    {pendingSalonCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="support">Support</TabsTrigger>
              <TabsTrigger value="refunds">Refunds</TabsTrigger>
              <TabsTrigger value="promos">Promos</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Pending Salon Approvals Alert */}
              {pendingSalonCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-orange-500/50 bg-orange-500/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <Store className="w-6 h-6 text-orange-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">New Salon Registrations</h3>
                              <Badge variant="destructive" className="animate-pulse">
                                {pendingSalonCount} Pending
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {pendingSalonCount} salon{pendingSalonCount !== 1 ? 's are' : ' is'} waiting for your approval
                            </p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => {
                            const salonsTab = document.querySelector<HTMLButtonElement>('[data-value="salons"]');
                            if (salonsTab) salonsTab.click();
                          }}
                          className="gap-2"
                        >
                          <Bell className="w-4 h-4" />
                          Review Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Users"
                  value={userCount}
                  icon={Users}
                  color="primary"
                />
                <StatCard
                  title="Total Bookings"
                  value={bookingStats.total}
                  subtitle={`${bookingStats.upcoming} upcoming`}
                  icon={Calendar}
                  color="primary"
                />
                <StatCard
                  title="Revenue"
                  value={`₹${bookingStats.revenue.toLocaleString()}`}
                  subtitle="From completed bookings"
                  icon={TrendingUp}
                  color="primary"
                />
                <StatCard
                  title="Wallet Balance"
                  value={`₹${walletStats.totalBalance.toLocaleString()}`}
                  subtitle={`₹${walletStats.totalEarned.toLocaleString()} earned`}
                  icon={Wallet}
                  color="primary"
                />
              </div>

            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-8">
              <PaymentManagement />
              <CommissionReports />
              <SalonCommissionReport />
            </TabsContent>

            {/* Payouts Tab */}
            <TabsContent value="payouts">
              <SalonPayoutManagement />
            </TabsContent>

            {/* Salons Tab */}
            <TabsContent value="salons" className="space-y-6">
              <Tabs defaultValue="pending" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
                  <TabsTrigger value="all">All Salons</TabsTrigger>
                  <TabsTrigger value="owners">Salon Owners</TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                  <PendingSalonApprovals />
                </TabsContent>

                <TabsContent value="all">
                  <SalonManagement />
                </TabsContent>

                <TabsContent value="owners">
                  <SalonOwnerManagement />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Support Tickets Tab */}
            <TabsContent value="support" className="space-y-6">
              <SupportTicketManagement />
            </TabsContent>

            {/* Refunds Tab */}
            <TabsContent value="refunds" className="space-y-6">
              <RefundManagement />
            </TabsContent>

            {/* Promo Codes Tab */}
            <TabsContent value="promos" className="space-y-6">
              <PromoCodeManagement />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <RevenueAnalytics />
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <UserManagement />
            </TabsContent>

            {/* Tools Tab */}
            <TabsContent value="tools" className="space-y-6">
              {/* Booking Status & Last 7 Days */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Booking Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Booking Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Clock className="w-6 h-6 mx-auto text-yellow-600 mb-2" />
                        <p className="text-2xl font-bold">{bookingStats.upcoming}</p>
                        <p className="text-xs text-muted-foreground">Upcoming</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-2" />
                        <p className="text-2xl font-bold">{bookingStats.completed}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <XCircle className="w-6 h-6 mx-auto text-destructive mb-2" />
                        <p className="text-2xl font-bold">{bookingStats.cancelled}</p>
                        <p className="text-xs text-muted-foreground">Cancelled</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Last 7 Days</CardTitle>
                    <CardDescription>Booking activity this week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between gap-2 h-32">
                      {dailyStats.map((day, i) => {
                        const maxBookings = Math.max(...dailyStats.map(d => d.bookings), 1);
                        const height = (day.bookings / maxBookings) * 100;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-xs font-medium">{day.bookings}</span>
                            <div 
                              className="w-full bg-primary/80 rounded-t transition-all"
                              style={{ height: `${Math.max(height, 4)}%` }}
                            />
                            <span className="text-[10px] text-muted-foreground">{day.date}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Live Activity & Recent Users */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LiveActivityFeed />
                <RecentUsers 
                  onViewAll={() => {
                    const usersTab = document.querySelector<HTMLButtonElement>('[data-value="users"]') || 
                                      document.querySelector<HTMLButtonElement>('[value="users"]');
                    if (usersTab) usersTab.click();
                  }} 
                />
              </div>

              {/* Test Phone Whitelist */}
              <TestPhoneWhitelist />

              {/* Salon Owners Section */}
              <SalonOwnerManagement />

              {/* Other Tools */}
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Other Tools</h3>
                <div className="grid gap-4">
                  <Card className="opacity-60">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Advanced Analytics</h3>
                          <p className="text-sm text-muted-foreground">Coming soon</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Soon</Badge>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>View user information and booking history</DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedUser.avatar_url || ''} />
                  <AvatarFallback className="text-xl">
                    {selectedUser.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedUser.full_name || 'Unnamed'}</h3>
                  <p className="text-sm text-muted-foreground">
                    Joined {format(new Date(selectedUser.created_at), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {selectedUser.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedUser.phone}</span>
                  </div>
                )}
                {selectedUser.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedUser.email}</span>
                    {selectedUser.email_verified && (
                      <Badge variant="secondary" className="text-[10px]">Verified</Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Recent Bookings</h4>
                {isLoadingUserDetails ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : userBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No bookings yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {userBookings.map((booking) => (
                      <div 
                        key={booking.id} 
                        className="p-3 bg-muted/50 rounded-lg text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{booking.salon_name}</span>
                          <Badge 
                            variant={
                              booking.status === 'completed' ? 'default' :
                              booking.status === 'cancelled' ? 'destructive' :
                              'secondary'
                            }
                            className="text-[10px]"
                          >
                            {booking.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{booking.service_name}</p>
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <span>{format(new Date(booking.booking_date), 'MMM d, yyyy')}</span>
                          <span>₹{booking.service_price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
