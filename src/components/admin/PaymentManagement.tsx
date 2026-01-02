import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, 
  XCircle, Loader2, Search, Filter, RefreshCw, Download,
  Building2, Wallet, TrendingUp, AlertCircle, Eye, ChevronRight,
  IndianRupee, Calendar, Store, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  salon_id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  captured_at: string | null;
  settled_at: string | null;
  settlement_id: string | null;
  platform_fee: number;
  salon_amount: number;
  fee_percentage: number;
  created_at: string;
  // Joined data
  salon?: { name: string };
  profile?: { full_name: string; phone: string };
}

interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  pendingAmount: number;
  capturedAmount: number;
  settledAmount: number;
  platformEarnings: number;
  salonPayable: number;
  onlinePayments: number;
  cashPayments: number;
  onlineCommission: number;
  cashCommission: number;
}

const PaymentManagement = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalPayments: 0,
    totalAmount: 0,
    pendingAmount: 0,
    capturedAmount: 0,
    settledAmount: 0,
    platformEarnings: 0,
    salonPayable: 0,
    onlinePayments: 0,
    cashPayments: 0,
    onlineCommission: 0,
    cashCommission: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          salon:salons(name),
          profile:profiles!payments_user_id_fkey(full_name, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type assertion since the join might not return the expected shape
      const paymentsData = (data || []) as unknown as Payment[];
      setPayments(paymentsData);

      // Calculate stats
      const capturedOrSettled = paymentsData.filter(p => ['captured', 'settled'].includes(p.status));
      const onlinePaymentsData = capturedOrSettled.filter(p => p.payment_method !== 'cash');
      const cashPaymentsData = capturedOrSettled.filter(p => p.payment_method === 'cash');
      
      const statsCalc: PaymentStats = {
        totalPayments: paymentsData.length,
        totalAmount: paymentsData.reduce((sum, p) => sum + p.amount, 0),
        pendingAmount: paymentsData.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
        capturedAmount: paymentsData.filter(p => p.status === 'captured').reduce((sum, p) => sum + p.amount, 0),
        settledAmount: paymentsData.filter(p => p.status === 'settled').reduce((sum, p) => sum + p.amount, 0),
        platformEarnings: capturedOrSettled.reduce((sum, p) => sum + p.platform_fee, 0),
        salonPayable: paymentsData.filter(p => p.status === 'captured').reduce((sum, p) => sum + p.salon_amount, 0),
        onlinePayments: onlinePaymentsData.length,
        cashPayments: cashPaymentsData.length,
        onlineCommission: onlinePaymentsData.reduce((sum, p) => sum + p.platform_fee, 0),
        cashCommission: cashPaymentsData.reduce((sum, p) => sum + p.platform_fee, 0)
      };
      setStats(statsCalc);
    } catch (err) {
      console.error('Error fetching payments:', err);
      toast({ title: 'Error', description: 'Failed to load payments', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPayments();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('payments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.razorpay_payment_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.razorpay_order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.salon as any)?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any; label: string }> = {
      pending: { variant: 'outline', icon: Clock, label: 'Pending' },
      authorized: { variant: 'secondary', icon: AlertCircle, label: 'Authorized' },
      captured: { variant: 'default', icon: CheckCircle, label: 'Captured' },
      settled: { variant: 'default', icon: Building2, label: 'Settled' },
      failed: { variant: 'destructive', icon: XCircle, label: 'Failed' },
      refunded: { variant: 'destructive', icon: ArrowDownRight, label: 'Refunded' }
    };
    
    const { variant, icon: Icon, label } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Payments"
          value={stats.totalPayments}
          subtitle={`₹${stats.totalAmount.toLocaleString()} total`}
          icon={CreditCard}
          color="bg-primary"
        />
        <StatCard
          title="Platform Earnings"
          value={`₹${stats.platformEarnings.toLocaleString()}`}
          subtitle="8% commission"
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatCard
          title="Pending Settlement"
          value={`₹${stats.capturedAmount.toLocaleString()}`}
          subtitle="Awaiting bank transfer"
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatCard
          title="Salon Payable"
          value={`₹${stats.salonPayable.toLocaleString()}`}
          subtitle="Due to salons"
          icon={Store}
          color="bg-blue-500"
        />
      </div>

      {/* Commission Summary */}
      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Platform Commission Summary (8%)
          </CardTitle>
          <CardDescription>Breakdown of commission earnings by payment type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-background/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Online Payments</span>
              </div>
              <p className="text-xl font-bold text-primary">₹{stats.onlineCommission.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.onlinePayments} transactions</p>
            </div>
            <div className="p-4 bg-background/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-muted-foreground">Cash Payments</span>
              </div>
              <p className="text-xl font-bold text-amber-600">₹{stats.cashCommission.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.cashPayments} transactions</p>
            </div>
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Total Commission</span>
              </div>
              <p className="text-2xl font-bold text-green-600">₹{stats.platformEarnings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.onlinePayments + stats.cashPayments} total transactions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by payment ID, order ID, or salon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="authorized">Authorized</SelectItem>
                <SelectItem value="captured">Captured</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchPayments}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
          <CardDescription>Track payment lifecycle from order to settlement</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No payments found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredPayments.map((payment) => (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedPayment(payment);
                      setShowPaymentDetails(true);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <IndianRupee className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">₹{payment.amount.toLocaleString()}</span>
                            {getStatusBadge(payment.status)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Store className="w-3 h-3" />
                            <span>{(payment.salon as any)?.name || 'Unknown Salon'}</span>
                            <span className="text-xs">•</span>
                            <span className="text-xs">{payment.razorpay_payment_id || payment.razorpay_order_id || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">
                          +₹{payment.platform_fee.toLocaleString()} commission
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.created_at), 'dd MMM, HH:mm')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={showPaymentDetails} onOpenChange={setShowPaymentDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>Complete payment transaction information</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-2xl font-bold">₹{selectedPayment.amount.toLocaleString()}</p>
                </div>
                {getStatusBadge(selectedPayment.status)}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Payment ID</p>
                  <p className="font-mono">{selectedPayment.razorpay_payment_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Order ID</p>
                  <p className="font-mono">{selectedPayment.razorpay_order_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Method</p>
                  <p className="capitalize">{selectedPayment.payment_method || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{format(new Date(selectedPayment.created_at), 'dd MMM yyyy, HH:mm')}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Split Breakdown</h4>
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Amount</span>
                    <span className="font-medium">₹{selectedPayment.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Platform Fee ({selectedPayment.fee_percentage}%)</span>
                    <span className="font-medium">₹{selectedPayment.platform_fee.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm font-medium">
                    <span>Salon Amount</span>
                    <span>₹{selectedPayment.salon_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {selectedPayment.captured_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Captured on {format(new Date(selectedPayment.captured_at), 'dd MMM yyyy, HH:mm')}
                </div>
              )}

              {selectedPayment.settled_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Settled on {format(new Date(selectedPayment.settled_at), 'dd MMM yyyy, HH:mm')}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentManagement;
