import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Loader2, Phone, Mail, UserCheck, UserX, 
  Calendar, ChevronDown, ChevronUp, IndianRupee,
  ShoppingBag, Wallet, Clock, CheckCircle, XCircle,
  Star, ArrowUpCircle, ArrowDownCircle, Gift,
  Activity, UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

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

interface UserBooking {
  id: string;
  salon_name: string;
  service_name: string;
  service_price: number;
  booking_date: string;
  booking_time: string;
  status: string;
  created_at: string;
}

interface UserWallet {
  balance: number;
  total_earned: number;
  total_spent: number;
}

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  description: string | null;
  created_at: string;
}

interface UserReview {
  id: string;
  salon_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

interface ActivityItem {
  id: string;
  type: 'booking' | 'transaction' | 'review' | 'signup';
  title: string;
  description: string;
  amount?: number;
  status?: string;
  rating?: number;
  timestamp: string;
  icon: 'booking' | 'credit' | 'debit' | 'review' | 'signup';
}

interface UserWithStats extends UserProfile {
  bookings: UserBooking[];
  wallet: UserWallet | null;
  transactions: WalletTransaction[];
  reviews: UserReview[];
  activities: ActivityItem[];
  totalBookings: number;
  totalSpent: number;
  dataLoaded: boolean;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [loadingUserData, setLoadingUserData] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: wallets } = await supabase
        .from('wallets')
        .select('user_id, balance, total_earned, total_spent');

      const { data: bookings } = await supabase
        .from('bookings')
        .select('user_id, service_price, status');

      const walletMap = new Map(wallets?.map(w => [w.user_id, w]) || []);
      
      const bookingStats = new Map<string, { total: number; spent: number }>();
      bookings?.forEach(b => {
        const current = bookingStats.get(b.user_id) || { total: 0, spent: 0 };
        current.total += 1;
        if (b.status === 'completed') {
          current.spent += b.service_price || 0;
        }
        bookingStats.set(b.user_id, current);
      });

      const usersWithStats: UserWithStats[] = (profiles || []).map(profile => {
        const wallet = walletMap.get(profile.user_id);
        const stats = bookingStats.get(profile.user_id) || { total: 0, spent: 0 };
        
        return {
          ...profile,
          bookings: [],
          transactions: [],
          reviews: [],
          activities: [],
          wallet: wallet ? {
            balance: wallet.balance || 0,
            total_earned: wallet.total_earned || 0,
            total_spent: wallet.total_spent || 0
          } : null,
          totalBookings: stats.total,
          totalSpent: stats.spent,
          dataLoaded: false
        };
      });

      setUsers(usersWithStats);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setIsLoading(false);
  };

  const fetchUserDetails = async (userId: string, userCreatedAt: string) => {
    setLoadingUserData(prev => new Set(prev).add(userId));
    
    try {
      // Fetch bookings, transactions, and reviews in parallel
      const [bookingsRes, transactionsRes, reviewsRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ]);

      const bookings = bookingsRes.data || [];
      const transactions = transactionsRes.data || [];
      const reviews = reviewsRes.data || [];

      // Build activity timeline
      const activities: ActivityItem[] = [];

      // Add signup activity
      activities.push({
        id: `signup-${userId}`,
        type: 'signup',
        title: 'Account Created',
        description: 'User signed up for an account',
        timestamp: userCreatedAt,
        icon: 'signup'
      });

      // Add booking activities
      bookings.forEach(b => {
        activities.push({
          id: `booking-${b.id}`,
          type: 'booking',
          title: `Booking at ${b.salon_name}`,
          description: `${b.service_name} - ${format(new Date(b.booking_date), 'MMM d, yyyy')} at ${b.booking_time}`,
          amount: b.service_price,
          status: b.status,
          timestamp: b.created_at,
          icon: 'booking'
        });
      });

      // Add transaction activities
      transactions.forEach(t => {
        activities.push({
          id: `txn-${t.id}`,
          type: 'transaction',
          title: t.type === 'credit' ? 'Wallet Credit' : 'Wallet Debit',
          description: t.description || `${t.category} transaction`,
          amount: t.amount,
          timestamp: t.created_at,
          icon: t.type === 'credit' ? 'credit' : 'debit'
        });
      });

      // Add review activities
      reviews.forEach(r => {
        activities.push({
          id: `review-${r.id}`,
          type: 'review',
          title: `Left a ${r.rating}-star review`,
          description: r.review_text || 'No comment',
          rating: r.rating,
          timestamp: r.created_at,
          icon: 'review'
        });
      });

      // Sort by timestamp descending
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setUsers(prev => prev.map(user => 
        user.user_id === userId 
          ? { 
              ...user, 
              bookings, 
              transactions, 
              reviews, 
              activities,
              dataLoaded: true 
            }
          : user
      ));
    } catch (error) {
      console.error('Error fetching user details:', error);
    }

    setLoadingUserData(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  };

  const toggleExpanded = async (userId: string, userCreatedAt: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
      const user = users.find(u => u.user_id === userId);
      if (user && !user.dataLoaded) {
        await fetchUserDetails(userId, userCreatedAt);
      }
    }
    setExpandedUsers(newExpanded);
  };

  const filteredUsers = users.filter(u => {
    const searchLower = searchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower) ||
      u.phone?.includes(searchQuery)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'upcoming':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">Upcoming</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActivityIcon = (icon: ActivityItem['icon']) => {
    switch (icon) {
      case 'booking':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
        );
      case 'credit':
        return (
          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
            <ArrowUpCircle className="w-4 h-4 text-green-600" />
          </div>
        );
      case 'debit':
        return (
          <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
            <ArrowDownCircle className="w-4 h-4 text-orange-600" />
          </div>
        );
      case 'review':
        return (
          <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <Star className="w-4 h-4 text-yellow-600" />
          </div>
        );
      case 'signup':
        return (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-primary" />
          </div>
        );
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star} 
            className={`w-3 h-3 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} 
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.02 }}
            >
              <Collapsible 
                open={expandedUsers.has(user.user_id)}
                onOpenChange={() => toggleExpanded(user.user_id, user.created_at)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12 shrink-0">
                          <AvatarImage src={user.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {user.full_name?.charAt(0) || user.phone?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate">
                              {user.full_name || 'Unnamed User'}
                            </h3>
                            <Badge 
                              variant={user.email_verified ? 'default' : 'secondary'} 
                              className="text-[10px] shrink-0"
                            >
                              {user.email_verified ? (
                                <><UserCheck className="w-3 h-3 mr-1" /> Verified</>
                              ) : (
                                <><UserX className="w-3 h-3 mr-1" /> Unverified</>
                              )}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                            {user.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {user.phone}
                              </span>
                            )}
                            {user.email && (
                              <span className="flex items-center gap-1 truncate max-w-[200px]">
                                <Mail className="w-3 h-3 shrink-0" />
                                {user.email}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-lg font-bold">{user.totalBookings}</p>
                            <p className="text-[10px] text-muted-foreground">Bookings</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-600">
                              ₹{user.totalSpent.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Spent</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-primary">
                              ₹{user.wallet?.balance.toLocaleString() || 0}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Wallet</p>
                          </div>
                        </div>

                        <Button variant="ghost" size="icon" className="shrink-0">
                          {expandedUsers.has(user.user_id) ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </Button>
                      </div>

                      {/* Mobile Stats */}
                      <div className="flex md:hidden items-center gap-4 mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{user.totalBookings} bookings</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <IndianRupee className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">
                            ₹{user.totalSpent.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-primary">
                            ₹{user.wallet?.balance.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t bg-muted/20">
                      {loadingUserData.has(user.user_id) ? (
                        <div className="flex justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        <Tabs defaultValue="activity" className="w-full">
                          <div className="px-4 pt-4">
                            <TabsList className="grid w-full grid-cols-4">
                              <TabsTrigger value="activity" className="text-xs">
                                <Activity className="w-3 h-3 mr-1" />
                                Activity
                              </TabsTrigger>
                              <TabsTrigger value="bookings" className="text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                Bookings
                              </TabsTrigger>
                              <TabsTrigger value="wallet" className="text-xs">
                                <Wallet className="w-3 h-3 mr-1" />
                                Wallet
                              </TabsTrigger>
                              <TabsTrigger value="reviews" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Reviews
                              </TabsTrigger>
                            </TabsList>
                          </div>

                          {/* Activity Timeline Tab */}
                          <TabsContent value="activity" className="p-4 pt-2">
                            <ScrollArea className="h-[400px] pr-4">
                              {user.activities.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">No activity yet</p>
                                </div>
                              ) : (
                                <div className="relative">
                                  {/* Timeline line */}
                                  <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />
                                  
                                  <div className="space-y-4">
                                    {user.activities.map((activity, idx) => (
                                      <motion.div
                                        key={activity.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="relative flex gap-4 pl-0"
                                      >
                                        <div className="relative z-10 bg-background">
                                          {getActivityIcon(activity.icon)}
                                        </div>
                                        <div className="flex-1 min-w-0 pb-4">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                              <p className="font-medium text-sm truncate">
                                                {activity.title}
                                              </p>
                                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                {activity.description}
                                              </p>
                                              {activity.rating && renderStars(activity.rating)}
                                            </div>
                                            <div className="text-right shrink-0">
                                              {activity.amount !== undefined && (
                                                <p className={`text-sm font-medium ${
                                                  activity.icon === 'credit' ? 'text-green-600' : 
                                                  activity.icon === 'debit' ? 'text-orange-600' : ''
                                                }`}>
                                                  {activity.icon === 'credit' && '+'}
                                                  {activity.icon === 'debit' && '-'}
                                                  ₹{activity.amount.toLocaleString()}
                                                </p>
                                              )}
                                              {activity.status && (
                                                <Badge 
                                                  variant={
                                                    activity.status === 'completed' ? 'default' :
                                                    activity.status === 'cancelled' ? 'destructive' :
                                                    'secondary'
                                                  }
                                                  className="text-[10px] mt-1"
                                                >
                                                  {activity.status}
                                                </Badge>
                                              )}
                                              <p className="text-[10px] text-muted-foreground mt-1">
                                                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </ScrollArea>
                          </TabsContent>

                          {/* Bookings Tab */}
                          <TabsContent value="bookings" className="p-4 pt-2">
                            {user.bookings.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No bookings yet</p>
                              </div>
                            ) : (
                              <div className="rounded-lg border overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Salon</TableHead>
                                      <TableHead>Service</TableHead>
                                      <TableHead>Date & Time</TableHead>
                                      <TableHead className="text-right">Amount</TableHead>
                                      <TableHead>Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {user.bookings.map((booking) => (
                                      <TableRow key={booking.id}>
                                        <TableCell className="font-medium">
                                          {booking.salon_name}
                                        </TableCell>
                                        <TableCell>{booking.service_name}</TableCell>
                                        <TableCell>
                                          <div className="text-sm">
                                            {format(new Date(booking.booking_date), 'MMM d, yyyy')}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {booking.booking_time}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                          ₹{booking.service_price.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                          {getStatusBadge(booking.status)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </TabsContent>

                          {/* Wallet Tab */}
                          <TabsContent value="wallet" className="p-4 pt-2">
                            {/* Wallet Summary */}
                            {user.wallet && (
                              <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center p-3 bg-primary/5 rounded-lg">
                                  <p className="text-xl font-bold text-primary">
                                    ₹{user.wallet.balance.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-muted-foreground">Balance</p>
                                </div>
                                <div className="text-center p-3 bg-green-500/5 rounded-lg">
                                  <p className="text-xl font-bold text-green-600">
                                    ₹{user.wallet.total_earned.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-muted-foreground">Earned</p>
                                </div>
                                <div className="text-center p-3 bg-orange-500/5 rounded-lg">
                                  <p className="text-xl font-bold text-orange-600">
                                    ₹{user.wallet.total_spent.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-muted-foreground">Spent</p>
                                </div>
                              </div>
                            )}

                            {/* Transactions */}
                            {user.transactions.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No transactions yet</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {user.transactions.map((txn) => (
                                  <div 
                                    key={txn.id}
                                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      {txn.type === 'credit' ? (
                                        <ArrowUpCircle className="w-5 h-5 text-green-600" />
                                      ) : (
                                        <ArrowDownCircle className="w-5 h-5 text-orange-600" />
                                      )}
                                      <div>
                                        <p className="text-sm font-medium capitalize">{txn.category}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {txn.description || 'Transaction'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className={`font-medium ${
                                        txn.type === 'credit' ? 'text-green-600' : 'text-orange-600'
                                      }`}>
                                        {txn.type === 'credit' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {format(new Date(txn.created_at), 'MMM d, yyyy')}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>

                          {/* Reviews Tab */}
                          <TabsContent value="reviews" className="p-4 pt-2">
                            {user.reviews.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No reviews yet</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {user.reviews.map((review) => (
                                  <div 
                                    key={review.id}
                                    className="p-3 bg-muted/30 rounded-lg"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      {renderStars(review.rating)}
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(review.created_at), 'MMM d, yyyy')}
                                      </span>
                                    </div>
                                    <p className="text-sm">
                                      {review.review_text || 'No comment provided'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-1">No users found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search query
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
