import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  IndianRupee, TrendingUp, Wallet, Calendar, ArrowUpRight, 
  ArrowDownRight, Clock, CheckCircle, XCircle, Loader2, Building
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

interface Payment {
  id: string;
  amount: number;
  platform_fee: number;
  salon_amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  booking_id: string | null;
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

interface EarningsStats {
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  thisMonthEarnings: number;
  platformFees: number;
}

export function SalonEarnings({ salonId, salonName }: SalonEarningsProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    thisMonthEarnings: 0,
    platformFees: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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
          setPayments(paymentsData || []);
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
        });
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Earnings</p>
                  <p className="text-xl font-bold text-green-600">₹{stats.totalEarnings.toLocaleString()}</p>
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
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">This Month</p>
                  <p className="text-xl font-bold text-primary">₹{stats.thisMonthEarnings.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border-yellow-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending Payouts</p>
                  <p className="text-xl font-bold text-yellow-600">₹{stats.pendingPayouts.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid Out</p>
                  <p className="text-xl font-bold text-blue-600">₹{stats.completedPayouts.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Platform Fee Info */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Platform Commission (2%)</span>
            </div>
            <span className="text-sm font-medium">₹{stats.platformFees.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

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
                          <p className="font-medium">₹{payment.amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            Your share: ₹{payment.salon_amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(payment.status)}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(payment.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
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
                        {getStatusBadge(payout.status)}
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