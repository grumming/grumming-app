import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Loader2, Phone, Mail, UserCheck, UserX, 
  Calendar, Eye, ChevronDown, ChevronUp, IndianRupee,
  ShoppingBag, Wallet, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
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

interface UserWithStats extends UserProfile {
  bookings: UserBooking[];
  wallet: UserWallet | null;
  totalBookings: number;
  totalSpent: number;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [loadingUserBookings, setLoadingUserBookings] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch all users with their wallets
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch wallets for all users
      const { data: wallets } = await supabase
        .from('wallets')
        .select('user_id, balance, total_earned, total_spent');

      // Fetch booking stats for all users
      const { data: bookings } = await supabase
        .from('bookings')
        .select('user_id, service_price, status');

      const walletMap = new Map(wallets?.map(w => [w.user_id, w]) || []);
      
      // Calculate booking stats per user
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
          wallet: wallet ? {
            balance: wallet.balance || 0,
            total_earned: wallet.total_earned || 0,
            total_spent: wallet.total_spent || 0
          } : null,
          totalBookings: stats.total,
          totalSpent: stats.spent
        };
      });

      setUsers(usersWithStats);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setIsLoading(false);
  };

  const fetchUserBookings = async (userId: string) => {
    setLoadingUserBookings(prev => new Set(prev).add(userId));
    
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setUsers(prev => prev.map(user => 
      user.user_id === userId 
        ? { ...user, bookings: bookings || [] }
        : user
    ));

    setLoadingUserBookings(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  };

  const toggleExpanded = async (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
      // Fetch bookings if not already loaded
      const user = users.find(u => u.user_id === userId);
      if (user && user.bookings.length === 0 && user.totalBookings > 0) {
        await fetchUserBookings(userId);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'upcoming':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Stats Header */}
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
                onOpenChange={() => toggleExpanded(user.user_id)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <Avatar className="w-12 h-12 shrink-0">
                          <AvatarImage src={user.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {user.full_name?.charAt(0) || user.phone?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>

                        {/* User Info */}
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

                        {/* Stats */}
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

                        {/* Expand Button */}
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
                      {/* Wallet Details */}
                      {user.wallet && (
                        <div className="p-4 border-b">
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            Wallet Details
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-primary/5 rounded-lg">
                              <p className="text-xl font-bold text-primary">
                                ₹{user.wallet.balance.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">Current Balance</p>
                            </div>
                            <div className="text-center p-3 bg-green-500/5 rounded-lg">
                              <p className="text-xl font-bold text-green-600">
                                ₹{user.wallet.total_earned.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">Total Earned</p>
                            </div>
                            <div className="text-center p-3 bg-orange-500/5 rounded-lg">
                              <p className="text-xl font-bold text-orange-600">
                                ₹{user.wallet.total_spent.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">Total Spent</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bookings Table */}
                      <div className="p-4">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Booking History ({user.totalBookings})
                        </h4>

                        {loadingUserBookings.has(user.user_id) ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          </div>
                        ) : user.bookings.length === 0 && user.totalBookings === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No bookings yet</p>
                          </div>
                        ) : user.bookings.length === 0 ? (
                          <div className="text-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                            <p className="text-sm text-muted-foreground mt-2">Loading bookings...</p>
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
                      </div>
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
