import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Receipt, Calendar, CreditCard, 
  Wallet, ArrowUpRight, ArrowDownLeft, Search,
  Filter, ChevronDown, Loader2, RefreshCw,
  CheckCircle2, Clock, XCircle, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { PaymentReceipt } from '@/components/PaymentReceipt';
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';

type FilterType = 'all' | 'credit' | 'debit';
type CategoryFilter = 'all' | 'booking_discount' | 'cashback' | 'referral' | 'topup' | 'refund';

interface BookingPayment {
  id: string;
  salon_name: string;
  service_name: string;
  service_price: number;
  booking_date: string;
  booking_time: string;
  status: string;
  payment_id: string | null;
  created_at: string;
}

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { transactions, isLoading: walletLoading } = useWallet();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'bookings' | 'wallet'>('bookings');
  const [bookingPayments, setBookingPayments] = useState<BookingPayment[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchBookingPayments();
    }
  }, [user]);

  const fetchBookingPayments = async () => {
    if (!user) return;
    
    setIsLoadingBookings(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
    } else {
      setBookingPayments(data || []);
    }
    setIsLoadingBookings(false);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
      confirmed: { label: 'Paid', color: 'text-green-600', icon: <CheckCircle2 className="w-3.5 h-3.5" />, bgColor: 'bg-green-100 dark:bg-green-900/30' },
      completed: { label: 'Completed', color: 'text-green-600', icon: <CheckCircle2 className="w-3.5 h-3.5" />, bgColor: 'bg-green-100 dark:bg-green-900/30' },
      upcoming: { label: 'Pay at Salon', color: 'text-blue-600', icon: <Clock className="w-3.5 h-3.5" />, bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
      pending_payment: { label: 'Pending', color: 'text-amber-600', icon: <Clock className="w-3.5 h-3.5" />, bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
      cancelled: { label: 'Cancelled', color: 'text-muted-foreground', icon: <XCircle className="w-3.5 h-3.5" />, bgColor: 'bg-muted' },
      refund_initiated: { label: 'Refund Initiated', color: 'text-purple-600', icon: <RefreshCw className="w-3.5 h-3.5" />, bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
      refunded: { label: 'Refunded', color: 'text-purple-600', icon: <CheckCircle2 className="w-3.5 h-3.5" />, bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
      payment_failed: { label: 'Payment Failed', color: 'text-red-600', icon: <AlertCircle className="w-3.5 h-3.5" />, bgColor: 'bg-red-100 dark:bg-red-900/30' },
    };
    return configs[status] || { label: status, color: 'text-muted-foreground', icon: <Clock className="w-3.5 h-3.5" />, bgColor: 'bg-muted' };
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      booking_discount: 'Booking Payment',
      cashback: 'Cashback',
      referral: 'Referral Reward',
      referral_bonus: 'Referral Bonus',
      referee_bonus: 'Welcome Bonus',
      promo_code: 'Promo Code',
      topup: 'Wallet Top-up',
      refund: 'Refund',
      manual: 'Adjustment',
      payment: 'Payment',
    };
    return labels[category] || category;
  };

  const getCategoryIcon = (category: string, type: string) => {
    if (type === 'credit') {
      return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-red-500" />;
  };

  const filteredBookings = bookingPayments.filter((booking) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSalon = booking.salon_name.toLowerCase().includes(query);
      const matchesService = booking.service_name.toLowerCase().includes(query);
      if (!matchesSalon && !matchesService) return false;
    }
    return true;
  });

  const filteredTransactions = transactions?.filter((tx) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesDescription = tx.description?.toLowerCase().includes(query);
      const matchesCategory = getCategoryLabel(tx.category).toLowerCase().includes(query);
      if (!matchesDescription && !matchesCategory) return false;
    }
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
    return true;
  }) || [];

  // Group bookings by date
  const groupByDate = <T extends { created_at: string }>(items: T[]) => {
    return items.reduce((groups, item) => {
      const date = parseISO(item.created_at);
      let groupKey: string;

      if (isToday(date)) {
        groupKey = 'Today';
      } else if (isYesterday(date)) {
        groupKey = 'Yesterday';
      } else if (isThisWeek(date)) {
        groupKey = 'This Week';
      } else if (isThisMonth(date)) {
        groupKey = 'This Month';
      } else {
        groupKey = format(date, 'MMMM yyyy');
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  };

  const groupedBookings = groupByDate(filteredBookings);
  const groupedTransactions = groupByDate(filteredTransactions);

  const handleViewBookingReceipt = (booking: BookingPayment) => {
    setSelectedTransaction({
      bookingId: booking.id,
      paymentId: booking.payment_id || booking.id,
      salonName: booking.salon_name,
      serviceName: booking.service_name,
      amount: booking.service_price,
      paidAmount: booking.service_price,
      paymentMethod: booking.payment_id ? 'Online Payment' : 'Pay at Salon',
      paidAt: parseISO(booking.created_at),
      status: booking.status,
    });
    setShowReceipt(true);
  };

  const handleViewReceipt = (tx: any) => {
    setSelectedTransaction({
      bookingId: tx.reference_id || tx.id,
      paymentId: tx.id,
      salonName: tx.description?.includes('at') 
        ? tx.description.split('at')[1]?.trim() || 'Service'
        : 'Grumming Service',
      serviceName: tx.description?.includes('for') 
        ? tx.description.split('for')[1]?.split('at')[0]?.trim() || getCategoryLabel(tx.category)
        : getCategoryLabel(tx.category),
      amount: tx.amount,
      paidAmount: tx.amount,
      paymentMethod: tx.type === 'credit' ? 'Credit' : 'Wallet',
      paidAt: parseISO(tx.created_at),
    });
    setShowReceipt(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Payment History</h1>
            <p className="text-sm text-muted-foreground">
              Track all your payments and refunds
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'bookings' | 'wallet')} className="px-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bookings" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="wallet" className="gap-2">
              <Wallet className="w-4 h-4" />
              Wallet
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'bookings' ? 'Search salons or services...' : 'Search transactions...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Filter Pills - Only for wallet tab */}
        {activeTab === 'wallet' && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {(['all', 'cashback', 'referral', 'refund'] as CategoryFilter[]).map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
                className="whitespace-nowrap"
              >
                {cat === 'all' ? 'All' : getCategoryLabel(cat)}
              </Button>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <div className="p-4 space-y-6">
        {activeTab === 'bookings' ? (
          isLoadingBookings ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : Object.keys(groupedBookings).length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Bookings Found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search' : 'Your booking payments will appear here'}
              </p>
            </motion.div>
          ) : (
            Object.entries(groupedBookings).map(([group, bookings]) => (
              <div key={group}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                  {group}
                </h3>
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {bookings.map((booking, index) => {
                      const statusConfig = getStatusConfig(booking.status);
                      return (
                        <motion.div
                          key={booking.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card 
                            className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleViewBookingReceipt(booking)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusConfig.bgColor}`}>
                                  {statusConfig.icon}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">{booking.salon_name}</p>
                                      <p className="text-sm text-muted-foreground truncate">
                                        {booking.service_name}
                                      </p>
                                    </div>
                                    <p className="font-semibold whitespace-nowrap">
                                      ₹{booking.service_price}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center gap-3 mt-2 text-xs">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                      <Calendar className="w-3 h-3" />
                                      {format(parseISO(booking.booking_date), 'dd MMM')} at {booking.booking_time}
                                    </span>
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-[10px] ${statusConfig.color} ${statusConfig.bgColor}`}
                                    >
                                      {statusConfig.label}
                                    </Badge>
                                  </div>

                                  {/* Payment ID if available */}
                                  {booking.payment_id && (
                                    <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                                      ID: {booking.payment_id.slice(0, 20)}...
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Action hint */}
                              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Receipt className="w-3 h-3" />
                                  Tap to view details
                                </span>
                                <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))
          )
        ) : (
          walletLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : Object.keys(groupedTransactions).length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
              <p className="text-muted-foreground">
                {searchQuery || categoryFilter !== 'all' ? 'Try adjusting your filters' : 'Your wallet transactions will appear here'}
              </p>
            </motion.div>
          ) : (
            Object.entries(groupedTransactions).map(([group, txs]) => (
              <div key={group}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                  {group}
                </h3>
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {txs.map((tx, index) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card 
                          className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleViewReceipt(tx)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                tx.type === 'credit' 
                                  ? 'bg-green-100 dark:bg-green-900/30' 
                                  : 'bg-red-100 dark:bg-red-900/30'
                              }`}>
                                {getCategoryIcon(tx.category, tx.type)}
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">
                                      {getCategoryLabel(tx.category)}
                                    </p>
                                    {tx.description && (
                                      <p className="text-sm text-muted-foreground truncate">
                                        {tx.description}
                                      </p>
                                    )}
                                  </div>
                                  <p className={`font-semibold whitespace-nowrap ${
                                    tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(parseISO(tx.created_at), 'dd MMM, hh:mm a')}
                                  </span>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {tx.type === 'credit' ? 'Credit' : 'Debit'}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Action hint */}
                            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Receipt className="w-3 h-3" />
                                Tap to view receipt
                              </span>
                              <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Receipt Dialog */}
      {selectedTransaction && (
        <PaymentReceipt
          open={showReceipt}
          onOpenChange={setShowReceipt}
          receipt={selectedTransaction}
        />
      )}
    </div>
  );
};

export default PaymentHistory;
