import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Receipt, Calendar, CreditCard, 
  Wallet, ArrowUpRight, ArrowDownLeft, Search,
  Filter, ChevronDown, Download, Share2, Loader2
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
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { PaymentReceipt } from '@/components/PaymentReceipt';
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';

type FilterType = 'all' | 'credit' | 'debit';
type CategoryFilter = 'all' | 'booking_discount' | 'cashback' | 'referral' | 'topup' | 'refund';

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { transactions, isLoading } = useWallet();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

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

  const filteredTransactions = transactions?.filter((tx) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesDescription = tx.description?.toLowerCase().includes(query);
      const matchesCategory = getCategoryLabel(tx.category).toLowerCase().includes(query);
      if (!matchesDescription && !matchesCategory) return false;
    }

    // Type filter
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

    // Category filter
    if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;

    return true;
  }) || [];

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, tx) => {
    const date = parseISO(tx.created_at);
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
    groups[groupKey].push(tx);
    return groups;
  }, {} as Record<string, typeof filteredTransactions>);

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

  if (authLoading || isLoading) {
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
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="px-4 pb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                All Types {typeFilter === 'all' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('credit')}>
                Credits Only {typeFilter === 'credit' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('debit')}>
                Debits Only {typeFilter === 'debit' && '✓'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Category Filter Pills */}
        <div className="px-4 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {(['all', 'booking_discount', 'cashback', 'referral', 'refund'] as CategoryFilter[]).map((cat) => (
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
      </header>

      {/* Transactions List */}
      <div className="p-4 space-y-6">
        {Object.keys(groupedTransactions).length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
            <p className="text-muted-foreground">
              {searchQuery || typeFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Your payment history will appear here'}
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
