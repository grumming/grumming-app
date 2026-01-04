import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IndianRupee, TrendingUp, Wallet, Calendar, ArrowUpRight, 
  ArrowDownRight, Clock, CheckCircle, XCircle, Loader2, Building, Smartphone, Zap, Building2, AlertTriangle, User, Banknote, ChevronDown, ChevronUp, Receipt
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface SalonEarningsProps {
  salonId: string;
  salonName: string;
}

interface PaymentMetadata {
  penalty_amount?: number;
  service_amount?: number;
}

interface Payment {
  id: string;
  amount: number;
  platform_fee: number;
  salon_amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  booking_id: string | null;
  user_id: string;
  metadata: PaymentMetadata | null;
  customerName?: string;
  serviceName?: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  payout_method: string | null;
  period_start: string | null;
  period_end: string | null;
  processed_at: string | null;
  created_at: string;
  notes: string | null;
}

interface CollectedPenalty {
  id: string;
  penalty_amount: number;
  service_name: string;
  original_salon: string;
  customer_name: string;
  created_at: string;
  remitted: boolean;
}

interface EarningsStats {
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  thisMonthEarnings: number;
  platformFees: number;
  totalPenalties: number;
}

export function SalonEarnings({ salonId, salonName }: SalonEarningsProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [collectedPenalties, setCollectedPenalties] = useState<CollectedPenalty[]>([]);
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    thisMonthEarnings: 0,
    platformFees: 0,
    totalPenalties: 0,
  });
  const [penaltyStats, setPenaltyStats] = useState({ pending: 0, remitted: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showMore, setShowMore] = useState(false);
  const [showPenaltyDetails, setShowPenaltyDetails] = useState(false);

  useEffect(() => {
    const fetchEarningsData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch payments for this salon
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('salon_id', salonId)
          .order('created_at', { ascending: false });

        if (paymentsError) {
          console.error('Error fetching payments:', paymentsError);
        } else {
          // Fetch customer profiles for payments
          const userIds = [...new Set((paymentsData || []).map(p => p.user_id))];
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);
          
          const profilesMap = new Map(
            (profilesData || []).map(p => [p.user_id, p.full_name])
          );
          
          // Fetch booking info for service names
          const bookingIds = [...new Set((paymentsData || []).filter(p => p.booking_id).map(p => p.booking_id as string))];
          const { data: bookingsData } = await supabase
            .from('bookings')
            .select('id, service_name')
            .in('id', bookingIds);
          
          const bookingsMap = new Map(
            (bookingsData || []).map(b => [b.id, b.service_name])
          );
          
          // Cast metadata to proper type and add customer names + service names
          const typedPayments = (paymentsData || []).map(p => ({
            ...p,
            metadata: p.metadata as PaymentMetadata | null,
            customerName: profilesMap.get(p.user_id) || 'Customer',
            serviceName: p.booking_id ? bookingsMap.get(p.booking_id) || undefined : undefined
          }));
          setPayments(typedPayments);
        }

        // Fetch payouts for this salon
        const { data: payoutsData, error: payoutsError } = await supabase
          .from('salon_payouts')
          .select('*')
          .eq('salon_id', salonId)
          .order('created_at', { ascending: false });

        if (payoutsError) {
          console.error('Error fetching payouts:', payoutsError);
        } else {
          setPayouts(payoutsData || []);
        }

        // Calculate stats
        const capturedPayments = (paymentsData || []).filter(p => 
          p.status === 'captured' || p.status === 'settled'
        );
        
        const totalEarnings = capturedPayments.reduce((sum, p) => sum + (p.salon_amount || 0), 0);
        const platformFees = capturedPayments.reduce((sum, p) => sum + (p.platform_fee || 0), 0);
        
        // Calculate total penalties (from metadata)
        const totalPenalties = capturedPayments.reduce((sum, p) => {
          const meta = p.metadata as PaymentMetadata | null;
          return sum + (meta?.penalty_amount || 0);
        }, 0);
        
        const pendingPayouts = (payoutsData || [])
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + p.amount, 0);
          
        const completedPayouts = (payoutsData || [])
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + p.amount, 0);

        // This month earnings
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());
        const thisMonthPayments = capturedPayments.filter(p => {
          const paymentDate = new Date(p.created_at);
          return paymentDate >= monthStart && paymentDate <= monthEnd;
        });
        const thisMonthEarnings = thisMonthPayments.reduce((sum, p) => sum + (p.salon_amount || 0), 0);

        setStats({
          totalEarnings,
          pendingPayouts,
          completedPayouts,
          thisMonthEarnings,
          platformFees,
          totalPenalties,
        });

        // Fetch collected penalties for this salon (cash payments where this salon collected penalty)
        const { data: penaltiesData, error: penaltiesError } = await supabase
          .from('cancellation_penalties')
          .select('id, penalty_amount, service_name, salon_name, user_id, created_at, remitted_to_platform')
          .eq('collecting_salon_id', salonId)
          .eq('is_paid', true)
          .order('created_at', { ascending: false });

        if (!penaltiesError && penaltiesData) {
          // Fetch customer names for penalties
          const penaltyUserIds = [...new Set(penaltiesData.map(p => p.user_id))];
          const { data: penaltyProfiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', penaltyUserIds);

          const penaltyProfilesMap = new Map(
            (penaltyProfiles || []).map(p => [p.user_id, p.full_name])
          );

          const formattedPenalties: CollectedPenalty[] = penaltiesData.map(p => ({
            id: p.id,
            penalty_amount: Number(p.penalty_amount),
            service_name: p.service_name,
            original_salon: p.salon_name,
            customer_name: penaltyProfilesMap.get(p.user_id) || 'Customer',
            created_at: p.created_at,
            remitted: p.remitted_to_platform === true,
          }));

          setCollectedPenalties(formattedPenalties);

          // Calculate penalty stats
          const pendingPenalties = formattedPenalties.filter(p => !p.remitted).reduce((sum, p) => sum + p.penalty_amount, 0);
          const remittedPenalties = formattedPenalties.filter(p => p.remitted).reduce((sum, p) => sum + p.penalty_amount, 0);
          setPenaltyStats({ pending: pendingPenalties, remitted: remittedPenalties });
        }
      } catch (error) {
        console.error('Error fetching earnings data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (salonId) {
      fetchEarningsData();
    }
  }, [salonId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'captured':
      case 'settled':
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPayoutMethodBadge = (method: string | null) => {
    switch (method?.toLowerCase()) {
      case 'instant_upi':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs gap-1">
            <Zap className="w-3 h-3" />
            Instant UPI
          </Badge>
        );
      case 'upi':
        return (
          <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs gap-1">
            <Smartphone className="w-3 h-3" />
            UPI
          </Badge>
        );
      case 'bank_transfer':
      case 'bank':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs gap-1">
            <Building2 className="w-3 h-3" />
            Bank
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards - This Month, Pending Payouts, Penalties */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 h-full">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">This Month</p>
                  <p className="text-base font-bold font-sans text-primary whitespace-nowrap">₹{stats.thisMonthEarnings.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border-yellow-500/20 h-full">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending Payouts</p>
                  <p className="text-base font-bold font-sans text-yellow-600 whitespace-nowrap">₹{stats.pendingPayouts.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Show More Button */}
      <button
        onClick={() => setShowMore(!showMore)}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {showMore ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Show Less
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Show More
          </>
        )}
      </button>

      {/* Total Earnings Card - Hidden by default */}
      {showMore && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Earnings</p>
                  <p className="text-base font-bold font-sans text-green-600 whitespace-nowrap">₹{stats.totalEarnings.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Penalties Breakdown - Shows penalties collected via cash that are owed to platform */}
      {collectedPenalties.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/5 border-red-500/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                    <Receipt className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-red-600">Penalty Deductions</p>
                    <p className="text-xs text-muted-foreground">
                      Cash penalties collected → deducted from payouts
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPenaltyDetails(!showPenaltyDetails)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {showPenaltyDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Details
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-red-500/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Pending Remittance</p>
                  <p className="text-lg font-bold font-sans text-red-600">
                    ₹{penaltyStats.pending.toLocaleString()}
                  </p>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Already Remitted</p>
                  <p className="text-lg font-bold font-sans text-green-600">
                    ₹{penaltyStats.remitted.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <AnimatePresence>
                {showPenaltyDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <div className="border-t border-border/50 pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Recent Penalties Collected</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {collectedPenalties.slice(0, 10).map((penalty) => (
                          <div key={penalty.id} className="flex items-center justify-between text-sm bg-background/50 rounded-lg p-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground font-medium truncate">{penalty.customer_name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {penalty.service_name} • {format(new Date(penalty.created_at), 'MMM d')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-sans font-medium text-red-600">
                                ₹{penalty.penalty_amount.toLocaleString()}
                              </span>
                              {penalty.remitted ? (
                                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Remitted
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {collectedPenalties.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          + {collectedPenalties.length - 10} more penalties
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Explanation */}
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-600 font-medium">Note:</span> When customers pay cancellation penalties via cash at your salon, these are platform fees that will be deducted from your next payout.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}


      {/* Tabs for Payments and Payouts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="payouts">Payouts ({payouts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-3 mt-4">
          {payments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <IndianRupee className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No payments yet</p>
                <p className="text-sm text-muted-foreground/70">Payments will appear here when customers book</p>
              </CardContent>
            </Card>
          ) : (
            payments.map((payment, index) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          payment.status === 'captured' || payment.status === 'settled'
                            ? 'bg-green-500/10'
                            : 'bg-yellow-500/10'
                        }`}>
                          {payment.status === 'captured' || payment.status === 'settled' ? (
                            <ArrowUpRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium font-sans">₹{payment.salon_amount.toLocaleString()}</p>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {payment.customerName}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {payment.serviceName || 'Service'} • after 8% commission
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center justify-end gap-2">
                          {payment.payment_method === 'upi' ? (
                            <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs gap-1">
                              <Smartphone className="w-3 h-3" />
                              UPI
                            </Badge>
                          ) : payment.payment_method === 'salon' ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs gap-1">
                              <Banknote className="w-3 h-3" />
                              Cash
                            </Badge>
                          ) : null}
                          {getStatusBadge(payment.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    {/* Show payment breakdown when penalty was included */}
                    {payment.metadata?.penalty_amount && payment.metadata.penalty_amount > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground text-xs">Service Amount</span>
                          <span className="font-sans text-foreground font-medium">
                            ₹{(payment.metadata.service_amount || payment.amount - payment.metadata.penalty_amount).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground text-xs">Your Earnings (92%)</span>
                          <span className="font-sans text-green-600 font-medium">
                            ₹{payment.salon_amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">
                              Penalty
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              (customer paid → platform)
                            </span>
                          </div>
                          <span className="font-sans text-orange-600 font-medium">
                            ₹{payment.metadata.penalty_amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        <TabsContent value="payouts" className="space-y-3 mt-4">
          {payouts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No payouts yet</p>
                <p className="text-sm text-muted-foreground/70">Payouts are processed weekly</p>
              </CardContent>
            </Card>
          ) : (
            payouts.map((payout, index) => (
              <motion.div
                key={payout.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          payout.status === 'completed'
                            ? 'bg-green-500/10'
                            : payout.status === 'processing'
                            ? 'bg-blue-500/10'
                            : 'bg-yellow-500/10'
                        }`}>
                          {payout.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : payout.status === 'processing' ? (
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          ) : (
                            <Clock className="w-5 h-5 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">₹{payout.amount.toLocaleString()}</p>
                          {payout.period_start && payout.period_end && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(payout.period_start), 'MMM d')} - {format(new Date(payout.period_end), 'MMM d')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(payout.status)}
                          {getPayoutMethodBadge(payout.payout_method)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {payout.processed_at 
                            ? format(new Date(payout.processed_at), 'MMM d, yyyy')
                            : format(new Date(payout.created_at), 'MMM d, yyyy')
                          }
                        </p>
                      </div>
                    </div>
                    {payout.notes && (
                      <p className="text-xs text-muted-foreground mt-2 pl-13">
                        {payout.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}