import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Wallet, ArrowUpRight, Clock, CheckCircle, 
  XCircle, Loader2, Search, Filter, RefreshCw, Plus,
  Store, User, CreditCard, AlertCircle, Eye, ChevronDown,
  IndianRupee, Calendar, Send, FileText, Download, Ban,
  Smartphone, ArrowDownToLine, Settings2
} from 'lucide-react';
import { PayoutScheduleSettings } from './PayoutScheduleSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, differenceInHours } from 'date-fns';

interface SalonPayout {
  id: string;
  salon_id: string;
  amount: number;
  status: string;
  payout_method: string | null;
  notes: string | null;
  period_start: string | null;
  period_end: string | null;
  processed_at: string | null;
  created_at: string;
  bank_account_id: string | null;
  upi_id: string | null;
  salon?: { name: string; image_url: string };
}

interface BankAccount {
  id: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string | null;
  upi_id: string | null;
  is_primary: boolean | null;
}

interface SalonEarnings {
  salon_id: string;
  salon_name: string;
  salon_image: string | null;
  total_earned: number;
  total_paid: number;
  pending_payout: number;
  last_payout_date: string | null;
}

const SalonPayoutManagement = () => {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<SalonPayout[]>([]);
  const [salonEarnings, setSalonEarnings] = useState<SalonEarnings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSalon, setExpandedSalon] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('instant');
  
  // Payout approval dialog
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<SalonPayout | null>(null);
  const [payoutBankAccount, setPayoutBankAccount] = useState<BankAccount | null>(null);
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<'bank' | 'upi'>('bank');
  const [customUpiId, setCustomUpiId] = useState('');
  const [payoutBreakdown, setPayoutBreakdown] = useState<{
    grossEarnings: number;
    platformFee: number;
    netAmount: number;
    totalPaid: number;
    pendingAmount: number;
  } | null>(null);
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch payouts with salon info
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('salon_payouts')
        .select(`
          *,
          salon:salons(name, image_url)
        `)
        .order('created_at', { ascending: false });

      if (payoutsError) throw payoutsError;
      setPayouts((payoutsData || []) as unknown as SalonPayout[]);

      // Fetch payments grouped by salon
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          salon_id,
          salon_amount,
          status,
          salon:salons(id, name, image_url)
        `)
        .in('status', ['captured', 'settled']);

      if (paymentsError) throw paymentsError;

      // Calculate earnings per salon
      const earningsMap = new Map<string, SalonEarnings>();
      
      (paymentsData || []).forEach((payment: any) => {
        if (!payment.salon_id) return;
        
        const existing = earningsMap.get(payment.salon_id);
        if (existing) {
          existing.total_earned += payment.salon_amount || 0;
        } else {
          earningsMap.set(payment.salon_id, {
            salon_id: payment.salon_id,
            salon_name: payment.salon?.name || 'Unknown',
            salon_image: payment.salon?.image_url,
            total_earned: payment.salon_amount || 0,
            total_paid: 0,
            pending_payout: 0,
            last_payout_date: null
          });
        }
      });

      // Add payout data - calculate total_paid from completed payouts
      (payoutsData || []).forEach((payout: any) => {
        const earnings = earningsMap.get(payout.salon_id);
        if (earnings && payout.status === 'completed') {
          earnings.total_paid += payout.amount;
          if (!earnings.last_payout_date || new Date(payout.processed_at) > new Date(earnings.last_payout_date)) {
            earnings.last_payout_date = payout.processed_at;
          }
        }
      });

      // Calculate pending_payout as total_earned minus total_paid
      earningsMap.forEach((earnings) => {
        earnings.pending_payout = Math.max(0, earnings.total_earned - earnings.total_paid);
      });

      setSalonEarnings(Array.from(earningsMap.values()).sort((a, b) => b.pending_payout - a.pending_payout));
    } catch (err) {
      console.error('Error fetching payout data:', err);
      toast({ title: 'Error', description: 'Failed to load payout data', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('payouts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salon_payouts' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBankAccount = async (salonId: string, bankAccountId?: string | null) => {
    try {
      let query = supabase
        .from('salon_bank_accounts')
        .select('*')
        .eq('salon_id', salonId);
      
      if (bankAccountId) {
        query = query.eq('id', bankAccountId);
      } else {
        query = query.eq('is_primary', true);
      }

      const { data, error } = await query.single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (err) {
      console.error('Error fetching bank account:', err);
      return null;
    }
  };

  const handleOpenApprovalDialog = async (payout: SalonPayout) => {
    setSelectedPayout(payout);
    const bankAccount = await fetchBankAccount(payout.salon_id, payout.bank_account_id);
    setPayoutBankAccount(bankAccount);
    
    // Set default payout method based on what's available
    if (payout.upi_id || bankAccount?.upi_id) {
      setSelectedPayoutMethod('upi');
      setCustomUpiId(payout.upi_id || bankAccount?.upi_id || '');
    } else {
      setSelectedPayoutMethod('bank');
    }

    // Fetch commission breakdown for this salon
    try {
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount, salon_amount, platform_fee, fee_percentage')
        .eq('salon_id', payout.salon_id)
        .in('status', ['captured', 'settled']);

      const { data: completedPayouts } = await supabase
        .from('salon_payouts')
        .select('amount')
        .eq('salon_id', payout.salon_id)
        .eq('status', 'completed');

      const grossEarnings = (paymentsData || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const platformFee = (paymentsData || []).reduce((sum, p) => sum + (p.platform_fee || 0), 0);
      const netAmount = (paymentsData || []).reduce((sum, p) => sum + (p.salon_amount || 0), 0);
      const totalPaid = (completedPayouts || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const pendingAmount = Math.max(0, netAmount - totalPaid);

      setPayoutBreakdown({
        grossEarnings,
        platformFee,
        netAmount,
        totalPaid,
        pendingAmount
      });
    } catch (err) {
      console.error('Error fetching breakdown:', err);
      setPayoutBreakdown(null);
    }
    
    setShowApprovalDialog(true);
  };

  const handleApprovePayout = async () => {
    if (!selectedPayout) return;
    
    setIsProcessing(true);
    try {
      const upiId = selectedPayoutMethod === 'upi' ? (customUpiId || payoutBankAccount?.upi_id) : null;
      
      const { error } = await supabase
        .from('salon_payouts')
        .update({
          status: 'processing',
          payout_method: selectedPayoutMethod === 'upi' ? 'upi' : 'bank_transfer',
          upi_id: upiId,
          processed_at: new Date().toISOString()
        })
        .eq('id', selectedPayout.id);

      if (error) throw error;

      toast({ title: 'Approved', description: `Payout approved and ${selectedPayoutMethod === 'upi' ? 'sent via UPI' : 'processing via bank transfer'}` });
      setShowApprovalDialog(false);
      setSelectedPayout(null);
      setPayoutBankAccount(null);
      fetchData();
    } catch (err) {
      console.error('Error approving payout:', err);
      toast({ title: 'Error', description: 'Failed to approve payout', variant: 'destructive' });
    }
    setIsProcessing(false);
  };

  const handleRejectPayout = async (payoutId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('salon_payouts')
        .update({
          status: 'failed',
          notes: reason || 'Rejected by admin'
        })
        .eq('id', payoutId);

      if (error) throw error;

      toast({ title: 'Rejected', description: 'Payout request has been rejected' });
      setShowApprovalDialog(false);
      setSelectedPayout(null);
      fetchData();
    } catch (err) {
      console.error('Error rejecting payout:', err);
      toast({ title: 'Error', description: 'Failed to reject payout', variant: 'destructive' });
    }
  };

  const handleCompletePayout = async (payoutId: string) => {
    try {
      const { error } = await supabase
        .from('salon_payouts')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', payoutId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Payout marked as completed' });
      fetchData();
    } catch (err) {
      console.error('Error completing payout:', err);
      toast({ title: 'Error', description: 'Failed to complete payout', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any; className?: string }> = {
      pending: { variant: 'outline', icon: Clock, className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      processing: { variant: 'secondary', icon: Loader2, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      completed: { variant: 'default', icon: CheckCircle, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      failed: { variant: 'destructive', icon: XCircle },
      cancelled: { variant: 'destructive', icon: Ban }
    };
    
    const { variant, icon: Icon, className } = config[status] || config.pending;
    return (
      <Badge variant="outline" className={`gap-1 capitalize ${className || ''}`}>
        <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {status}
      </Badge>
    );
  };

  const getWaitTime = (createdAt: string) => {
    const hours = differenceInHours(new Date(), new Date(createdAt));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const pendingRequests = payouts.filter(p => p.status === 'pending');
  const processingPayouts = payouts.filter(p => p.status === 'processing');
  
  // Separate instant and normal payouts
  const instantPendingRequests = pendingRequests.filter(p => p.payout_method === 'instant_upi');
  const normalPendingRequests = pendingRequests.filter(p => p.payout_method !== 'instant_upi');
  const instantProcessingPayouts = processingPayouts.filter(p => p.payout_method === 'instant_upi');
  const normalProcessingPayouts = processingPayouts.filter(p => p.payout_method !== 'instant_upi');
  
  const totalPending = salonEarnings.reduce((sum, s) => sum + s.pending_payout, 0);
  const totalPaid = payouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Instant Pending</p>
                <p className="text-2xl font-bold text-purple-600">{instantPendingRequests.length}</p>
                <p className="text-xs text-muted-foreground">
                  ₹{instantPendingRequests.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Normal Pending</p>
                <p className="text-2xl font-bold text-amber-600">{normalPendingRequests.length}</p>
                <p className="text-xs text-muted-foreground">
                  ₹{normalPendingRequests.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-blue-600">{processingPayouts.length}</p>
                <p className="text-xs text-muted-foreground">
                  {instantProcessingPayouts.length} instant • {normalProcessingPayouts.length} normal
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid Out</p>
                <p className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">All time</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="instant" className="relative">
            <Smartphone className="w-4 h-4 mr-1" />
            Instant Payouts
            {instantPendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                {instantPendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="normal" className="relative">
            <Building2 className="w-4 h-4 mr-1" />
            Normal Payouts
            {normalPendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                {normalPendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="earnings">Salon Earnings</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="w-4 h-4 mr-1" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Instant Payouts Tab */}
        <TabsContent value="instant" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-purple-600" />
                  Instant Payout Requests
                </CardTitle>
                <CardDescription>Priority requests with 1% convenience fee - process within minutes</CardDescription>
              </div>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : instantPendingRequests.length === 0 && instantProcessingPayouts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p className="font-medium">No instant payout requests</p>
                  <p className="text-sm">All instant requests have been processed</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {/* Pending instant requests */}
                    {instantPendingRequests.map((payout) => (
                      <motion.div
                        key={payout.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 overflow-hidden flex-shrink-0 flex items-center justify-center">
                              <Smartphone className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-lg">₹{payout.amount.toLocaleString()}</p>
                                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                                  Instant
                                </Badge>
                                {getStatusBadge(payout.status)}
                              </div>
                              <p className="font-medium">{(payout.salon as any)?.name || 'Unknown Salon'}</p>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {getWaitTime(payout.created_at)}
                                </span>
                                <span className="flex items-center gap-1 text-purple-600">
                                  <Smartphone className="w-3 h-3" />
                                  Instant UPI
                                </span>
                              </div>
                              {payout.upi_id && (
                                <p className="text-sm text-muted-foreground mt-1">UPI: {payout.upi_id}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRejectPayout(payout.id)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button 
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700"
                              onClick={() => handleOpenApprovalDialog(payout)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Processing instant payouts */}
                    {instantProcessingPayouts.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <p className="text-sm font-medium text-muted-foreground mb-2">Processing</p>
                        {instantProcessingPayouts.map((payout) => (
                          <motion.div
                            key={payout.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border rounded-lg p-4 bg-purple-50/50 dark:bg-purple-900/10"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold">₹{payout.amount.toLocaleString()}</p>
                                    {getStatusBadge(payout.status)}
                                  </div>
                                  <p className="text-sm">{(payout.salon as any)?.name || 'Unknown Salon'}</p>
                                  <p className="text-xs text-muted-foreground mt-1">UPI: {payout.upi_id}</p>
                                </div>
                              </div>
                              <Button size="sm" onClick={() => handleCompletePayout(payout.id)}>
                                Mark Complete
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Normal Payouts Tab */}
        <TabsContent value="normal" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownToLine className="w-5 h-5" />
                  Normal Payout Requests
                </CardTitle>
                <CardDescription>Standard bank transfer and UPI payout requests</CardDescription>
              </div>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : normalPendingRequests.length === 0 && normalProcessingPayouts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm">No pending normal payout requests</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {/* Pending normal requests */}
                    {normalPendingRequests.map((payout) => (
                      <motion.div
                        key={payout.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                              {(payout.salon as any)?.image_url ? (
                                <img 
                                  src={(payout.salon as any).image_url} 
                                  alt={(payout.salon as any)?.name} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Store className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-lg">₹{payout.amount.toLocaleString()}</p>
                                {getStatusBadge(payout.status)}
                              </div>
                              <p className="font-medium">{(payout.salon as any)?.name || 'Unknown Salon'}</p>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {getWaitTime(payout.created_at)}
                                </span>
                                {payout.payout_method && (
                                  <span className="flex items-center gap-1">
                                    {payout.payout_method === 'upi' ? (
                                      <Smartphone className="w-3 h-3" />
                                    ) : (
                                      <Building2 className="w-3 h-3" />
                                    )}
                                    {payout.payout_method === 'upi' ? 'UPI' : 'Bank Transfer'}
                                  </span>
                                )}
                              </div>
                              {payout.notes && (
                                <p className="text-sm text-muted-foreground mt-1 italic">"{payout.notes}"</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRejectPayout(payout.id)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleOpenApprovalDialog(payout)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Processing normal payouts */}
                    {normalProcessingPayouts.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <p className="text-sm font-medium text-muted-foreground mb-2">Processing</p>
                        {normalProcessingPayouts.map((payout) => (
                          <motion.div
                            key={payout.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold">₹{payout.amount.toLocaleString()}</p>
                                    {getStatusBadge(payout.status)}
                                  </div>
                                  <p className="text-sm">{(payout.salon as any)?.name || 'Unknown Salon'}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    {payout.payout_method === 'upi' ? (
                                      <span className="flex items-center gap-1">
                                        <Smartphone className="w-3 h-3" />
                                        UPI: {payout.upi_id}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1">
                                        <Building2 className="w-3 h-3" />
                                        Bank Transfer
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button size="sm" onClick={() => handleCompletePayout(payout.id)}>
                                Mark Complete
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salon Earnings Tab */}
        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Salon Earnings</CardTitle>
                <CardDescription>View and manage salon payouts</CardDescription>
              </div>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : salonEarnings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No salon earnings data</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {salonEarnings.map((salon) => (
                      <Collapsible
                        key={salon.salon_id}
                        open={expandedSalon === salon.salon_id}
                        onOpenChange={() => setExpandedSalon(expandedSalon === salon.salon_id ? null : salon.salon_id)}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border rounded-lg overflow-hidden"
                        >
                          <CollapsibleTrigger className="w-full p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                                  {salon.salon_image ? (
                                    <img src={salon.salon_image} alt={salon.salon_name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Store className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="text-left">
                                  <p className="font-medium">{salon.salon_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Total: ₹{salon.total_earned.toLocaleString()} • Paid: ₹{salon.total_paid.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {salon.pending_payout > 0 && (
                                  <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 border-orange-200">
                                    ₹{salon.pending_payout.toLocaleString()} pending
                                  </Badge>
                                )}
                                <ChevronDown className={`w-5 h-5 transition-transform ${expandedSalon === salon.salon_id ? 'rotate-180' : ''}`} />
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-4 pt-0 border-t bg-muted/30">
                              <div className="flex items-center justify-between mt-4">
                                <div className="text-sm">
                                  {salon.last_payout_date && (
                                    <p className="text-muted-foreground">
                                      Last payout: {format(new Date(salon.last_payout_date), 'dd MMM yyyy')}
                                    </p>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Salon owners can request payouts from their dashboard
                                </p>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </motion.div>
                      </Collapsible>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payout History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Track all payout status and history</CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No payouts yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {payouts.map((payout) => (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {payout.payout_method === 'upi' ? (
                              <Smartphone className="w-5 h-5 text-primary" />
                            ) : (
                              <IndianRupee className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">₹{payout.amount.toLocaleString()}</span>
                              {getStatusBadge(payout.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {(payout.salon as any)?.name || 'Unknown'} • {format(new Date(payout.created_at), 'dd MMM yyyy')}
                            </p>
                            {payout.payout_method && (
                              <p className="text-xs text-muted-foreground">
                                {payout.payout_method === 'upi' ? `UPI: ${payout.upi_id}` : 'Bank Transfer'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {payout.status === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => handleOpenApprovalDialog(payout)}>
                              Review
                            </Button>
                          )}
                          {payout.status === 'processing' && (
                            <Button size="sm" onClick={() => handleCompletePayout(payout.id)}>
                              Mark Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <PayoutScheduleSettings />
        </TabsContent>
      </Tabs>

      {/* Payout Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Payout Request</DialogTitle>
            <DialogDescription>
              Review and approve payout for {(selectedPayout?.salon as any)?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayout && (
            <div className="space-y-4">
              {/* Commission Breakdown */}
              {payoutBreakdown && (
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Commission Breakdown
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gross Earnings</span>
                      <span className="font-medium">₹{payoutBreakdown.grossEarnings.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-orange-600">
                      <span className="flex items-center gap-1">
                        Platform Fee (8%)
                      </span>
                      <span className="font-medium">- ₹{payoutBreakdown.platformFee.toLocaleString()}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Net Earnings</span>
                      <span className="font-medium">₹{payoutBreakdown.netAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Already Paid</span>
                      <span className="font-medium">₹{payoutBreakdown.totalPaid.toLocaleString()}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Available for Payout</span>
                      <span className="text-primary">₹{payoutBreakdown.pendingAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Requested Amount with Warning */}
              {payoutBreakdown && selectedPayout.amount > payoutBreakdown.pendingAmount ? (
                <div className="p-4 bg-destructive/10 border-2 border-destructive/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-destructive font-medium">Requested Amount</span>
                    <span className="text-2xl font-bold text-destructive">₹{selectedPayout.amount.toLocaleString()}</span>
                  </div>
                  <div className="mt-3 p-3 bg-destructive/20 rounded-md">
                    <div className="flex items-start gap-2 text-destructive">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">Exceeds Available Balance!</p>
                        <p className="text-xs mt-1">
                          Requested ₹{selectedPayout.amount.toLocaleString()} but only ₹{payoutBreakdown.pendingAmount.toLocaleString()} is available.
                        </p>
                        <p className="text-xs mt-1 font-medium">
                          Overage: ₹{(selectedPayout.amount - payoutBreakdown.pendingAmount).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Requested Amount</span>
                    <span className="text-2xl font-bold">₹{selectedPayout.amount.toLocaleString()}</span>
                  </div>
                  {payoutBreakdown && selectedPayout.amount === payoutBreakdown.pendingAmount && (
                    <div className="mt-2 flex items-center gap-2 text-green-600 text-xs">
                      <CheckCircle className="w-4 h-4" />
                      Matches available balance
                    </div>
                  )}
                </div>
              )}

              {/* Requested Payout Method (Read-only) */}
              <div className="space-y-3">
                <Label>Requested Payout Method</Label>
                <div className="p-3 border rounded-lg border-primary bg-primary/5">
                  {selectedPayout.payout_method === 'upi' || selectedPayout.upi_id ? (
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">UPI Transfer</p>
                        <p className="text-xs text-muted-foreground">Instant transfer</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">Bank Transfer</p>
                        <p className="text-xs text-muted-foreground">1-2 business days</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bank Account Details */}
              {selectedPayoutMethod === 'bank' && payoutBankAccount && (
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Bank Account</span>
                  </div>
                  <p className="text-sm">{payoutBankAccount.account_holder_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {payoutBankAccount.bank_name || 'Bank'} • ****{payoutBankAccount.account_number.slice(-4)}
                  </p>
                  <p className="text-xs text-muted-foreground">IFSC: {payoutBankAccount.ifsc_code}</p>
                </div>
              )}

              {/* UPI ID (Read-only) */}
              {selectedPayoutMethod === 'upi' && (
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">UPI ID</span>
                  </div>
                  <p className="text-sm font-mono">{customUpiId || selectedPayout.upi_id || payoutBankAccount?.upi_id || 'Not provided'}</p>
                </div>
              )}

              {/* No bank account warning */}
              {selectedPayoutMethod === 'bank' && !payoutBankAccount && (
                <div className="p-3 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-sm">No bank account on file. Ask salon owner to add bank details.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprovePayout} 
              disabled={
                isProcessing || 
                (selectedPayoutMethod === 'bank' && !payoutBankAccount) ||
                (selectedPayoutMethod === 'upi' && !customUpiId)
              }
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : selectedPayoutMethod === 'upi' ? (
                <Smartphone className="w-4 h-4 mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {selectedPayoutMethod === 'upi' ? 'Send via UPI' : 'Process Bank Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalonPayoutManagement;
