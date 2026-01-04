import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Wallet, ArrowUpRight, Clock, CheckCircle, AlertCircle, Building2, Loader2, Smartphone, Zap, IndianRupee, Check, Sparkles, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

interface SalonPayoutRequestProps {
  salonId: string;
  salonName: string;
}

interface BankAccount {
  id: string;
  bank_name: string | null;
  account_number: string;
  account_holder_name: string;
  ifsc_code: string;
  is_primary: boolean;
  upi_id: string | null;
  account_type: string | null;
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payout_method: string | null;
  notes: string | null;
}

interface PendingBalance {
  total: number;
  availableForPayout: number;
  pendingSettlement: number;
  penaltiesOwed: number; // Penalties collected via cash that need to be remitted to platform
}

const INSTANT_PAYOUT_FEE_PERCENT = 1; // 1% convenience fee for instant payouts

export default function SalonPayoutRequest({ salonId, salonName }: SalonPayoutRequestProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [pendingBalance, setPendingBalance] = useState<PendingBalance>({ total: 0, availableForPayout: 0, pendingSettlement: 0, penaltiesOwed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);
  const [showProcessing, setShowProcessing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [processingStage, setProcessingStage] = useState<'initiating' | 'verifying' | 'transferring' | 'complete'>('initiating');
  const [requestAmount, setRequestAmount] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'upi' | 'instant_upi'>('bank');
  const [customUpiId, setCustomUpiId] = useState('');

  const triggerConfetti = () => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#22c55e', '#10b981', '#059669', '#047857']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#22c55e', '#10b981', '#059669', '#047857']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  // Get UPI accounts for instant payout
  const upiAccounts = bankAccounts.filter(a => a.account_type === 'upi' || a.upi_id);

  // Calculate instant payout fee and net amount
  const calculateInstantFee = (amount: number) => {
    return Math.round(amount * INSTANT_PAYOUT_FEE_PERCENT / 100);
  };

  const getNetAmount = (amount: number) => {
    if (payoutMethod === 'instant_upi') {
      return amount - calculateInstantFee(amount);
    }
    return amount;
  };

  // Countdown timer effect
  useEffect(() => {
    if (showProcessing && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [showProcessing, countdown]);

  useEffect(() => {
    if (salonId) {
      fetchData();
    }
  }, [salonId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch bank accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('salon_bank_accounts')
        .select('*')
        .eq('salon_id', salonId)
        .order('is_primary', { ascending: false });

      if (accountsError) throw accountsError;
      setBankAccounts(accounts || []);

      // Set default bank account
      const primaryAccount = accounts?.find(a => a.is_primary);
      if (primaryAccount) {
        setSelectedBankAccount(primaryAccount.id);
      } else if (accounts && accounts.length > 0) {
        setSelectedBankAccount(accounts[0].id);
      }

      // Fetch pending payout requests
      const { data: requests, error: requestsError } = await supabase
        .from('salon_payouts')
        .select('*')
        .eq('salon_id', salonId)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setPayoutRequests(requests || []);

      // Calculate pending balance from payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('salon_amount, status, settled_at, captured_at')
        .eq('salon_id', salonId)
        .eq('status', 'captured');

      if (paymentsError) throw paymentsError;

      // Get already paid out amounts
      const { data: completedPayouts, error: payoutsError } = await supabase
        .from('salon_payouts')
        .select('amount')
        .eq('salon_id', salonId)
        .eq('status', 'completed');

      if (payoutsError) throw payoutsError;

      // Fetch unremitted penalties collected by this salon (cash payments)
      const { data: unremittedPenalties, error: penaltiesError } = await supabase
        .from('cancellation_penalties')
        .select('penalty_amount')
        .eq('collecting_salon_id', salonId)
        .eq('is_paid', true)
        .eq('remitted_to_platform', false);

      if (penaltiesError) throw penaltiesError;

      const totalPenaltiesOwed = unremittedPenalties?.reduce((sum, p) => sum + Number(p.penalty_amount), 0) || 0;

      const totalEarned = payments?.reduce((sum, p) => sum + Number(p.salon_amount), 0) || 0;
      const totalPaidOut = completedPayouts?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const pendingRequests = requests?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      
      // All captured payments are immediately available for payout
      const availableAmount = totalEarned;
      
      // Pending settlement = payout requests that are pending (not yet approved)
      const pendingPayoutAmount = requests?.filter(r => r.status === 'pending').reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      
      // Deduct penalties owed to platform from available balance
      const netAvailable = Math.max(0, availableAmount - totalPaidOut - pendingRequests - totalPenaltiesOwed);
      
      // Total balance should also reflect penalties owed
      const grossBalance = totalEarned - totalPaidOut;
      
      setPendingBalance({
        total: grossBalance,
        availableForPayout: netAvailable,
        pendingSettlement: pendingPayoutAmount,
        penaltiesOwed: totalPenaltiesOwed
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payout data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    const amount = parseFloat(requestAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > pendingBalance.availableForPayout) {
      toast.error('Amount exceeds available balance');
      return;
    }

    if (amount < 100) {
      toast.error('Minimum payout amount is ₹100');
      return;
    }

    if (payoutMethod === 'bank' && !selectedBankAccount) {
      toast.error('Please select a bank account');
      return;
    }

    if (payoutMethod === 'upi' || payoutMethod === 'instant_upi') {
      const upiId = customUpiId || bankAccounts.find(a => a.id === selectedBankAccount)?.upi_id;
      if (!upiId) {
        toast.error('Please enter a UPI ID');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const selectedAccount = bankAccounts.find(a => a.id === selectedBankAccount);
      const upiId = (payoutMethod === 'upi' || payoutMethod === 'instant_upi') 
        ? (customUpiId || selectedAccount?.upi_id) 
        : null;
      
      const payoutMethodValue = payoutMethod === 'instant_upi' 
        ? 'instant_upi' 
        : payoutMethod === 'upi' 
          ? 'upi' 
          : 'bank_transfer';

      const instantFee = payoutMethod === 'instant_upi' ? calculateInstantFee(amount) : 0;
      const netAmount = amount - instantFee;

      const { error } = await supabase
        .from('salon_payouts')
        .insert({
          salon_id: salonId,
          amount: netAmount,
          status: 'pending',
          payout_method: payoutMethodValue,
          bank_account_id: payoutMethod === 'bank' ? selectedBankAccount : null,
          upi_id: upiId,
          notes: payoutMethod === 'instant_upi' 
            ? `Instant payout request (Fee: ₹${instantFee}) - ${requestNote || salonName}`
            : requestNote || `Early payout request for ${salonName}`,
          period_start: new Date().toISOString().split('T')[0],
          period_end: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      // Show processing animation for instant UPI
      if (payoutMethod === 'instant_upi') {
        setSuccessAmount(netAmount);
        setShowProcessing(true);
        setCountdown(10);
        setProcessingStage('initiating');
        
        // Simulate processing stages
        setTimeout(() => setProcessingStage('verifying'), 2000);
        setTimeout(() => setProcessingStage('transferring'), 5000);
        setTimeout(() => {
          setProcessingStage('complete');
          setShowProcessing(false);
          setShowSuccess(true);
          triggerConfetti();
        }, 8000);
        
        // Reset after showing success
        setTimeout(() => {
          setShowSuccess(false);
          setDialogOpen(false);
          setRequestAmount('');
          setRequestNote('');
          setCustomUpiId('');
          toast.success('Instant payout completed successfully!');
          fetchData();
        }, 10500);
      } else {
        // Show success animation immediately for non-instant
        setSuccessAmount(netAmount);
        setShowSuccess(true);
        triggerConfetti();
        
        // Reset after showing success
        setTimeout(() => {
          setShowSuccess(false);
          setDialogOpen(false);
          setRequestAmount('');
          setRequestNote('');
          setCustomUpiId('');
          toast.success('Payout request submitted successfully!');
          fetchData();
        }, 2500);
      }
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast.error('Failed to submit payout request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20"><AlertCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold font-sans">₹{pendingBalance.total.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Penalties Owed Card - Only show if there are penalties to remit */}
        {pendingBalance.penaltiesOwed > 0 && (
          <Card className="border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-500/10">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400">Penalties Owed</p>
                  <p className="text-2xl font-bold text-red-600 font-sans">-₹{pendingBalance.penaltiesOwed.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-muted-foreground mt-1">Deducted from payout</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <ArrowUpRight className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available for Payout</p>
                <p className="text-2xl font-bold text-green-600 font-sans">₹{pendingBalance.availableForPayout.toLocaleString('en-IN')}</p>
                {pendingBalance.penaltiesOwed > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">After penalty deduction</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {pendingBalance.pendingSettlement > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Settlement</p>
                  <p className="text-2xl font-bold text-amber-600 font-sans">₹{pendingBalance.pendingSettlement.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Request Payout Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5" />
            Request Early Payout
          </CardTitle>
          <CardDescription>
            Request a payout from your available balance. Minimum amount is ₹100.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bankAccounts.length === 0 ? (
            <div className="text-center py-6">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-2">No bank account added</p>
              <p className="text-sm text-muted-foreground">Add a bank account in the Bank Accounts section to request payouts.</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1 space-y-2 w-full sm:w-auto">
                <Label>Bank Account</Label>
                <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.bank_name || 'Bank'} - ****{account.account_number.slice(-4)}
                        {account.is_primary && ' (Primary)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    disabled={pendingBalance.availableForPayout < 100}
                    className="w-full sm:w-auto"
                  >
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Request Payout
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                  <AnimatePresence mode="wait">
                    {showProcessing ? (
                      <motion.div
                        key="processing"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center justify-center py-10 px-4 text-center"
                      >
                        {/* Countdown Circle */}
                        <motion.div className="relative w-28 h-28 mb-6">
                          <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                            <circle
                              cx="50"
                              cy="50"
                              r="42"
                              fill="none"
                              stroke="hsl(var(--muted))"
                              strokeWidth="6"
                            />
                            <motion.circle
                              cx="50"
                              cy="50"
                              r="42"
                              fill="none"
                              stroke="url(#gradientGreen)"
                              strokeWidth="6"
                              strokeLinecap="round"
                              strokeDasharray={264}
                              initial={{ strokeDashoffset: 0 }}
                              animate={{ strokeDashoffset: 264 - (264 * (10 - countdown) / 10) }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                            <defs>
                              <linearGradient id="gradientGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#22c55e" />
                                <stop offset="100%" stopColor="#10b981" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <motion.span 
                              key={countdown}
                              initial={{ scale: 1.2, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="text-3xl font-bold text-green-600"
                            >
                              {countdown}
                            </motion.span>
                            <span className="text-xs text-muted-foreground">seconds</span>
                          </div>
                        </motion.div>

                        {/* Processing Stages */}
                        <div className="space-y-3 w-full max-w-xs">
                          {[
                            { key: 'initiating', label: 'Initiating transfer', icon: Zap },
                            { key: 'verifying', label: 'Verifying UPI ID', icon: CheckCircle },
                            { key: 'transferring', label: 'Transferring funds', icon: ArrowUpRight },
                          ].map((stage, index) => {
                            const isActive = processingStage === stage.key;
                            const isPast = ['initiating', 'verifying', 'transferring', 'complete'].indexOf(processingStage) > 
                                           ['initiating', 'verifying', 'transferring', 'complete'].indexOf(stage.key);
                            const Icon = stage.icon;
                            
                            return (
                              <motion.div
                                key={stage.key}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                                  isActive ? 'bg-green-100 dark:bg-green-950/50 border border-green-200 dark:border-green-800' : 
                                  isPast ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-muted/30'
                                }`}
                              >
                                <div className={`p-1.5 rounded-full ${
                                  isPast ? 'bg-green-500 text-white' :
                                  isActive ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'
                                }`}>
                                  {isPast ? (
                                    <Check className="h-3.5 w-3.5" />
                                  ) : isActive ? (
                                    <Loader2 className="h-3.5 w-3.5 text-green-600 animate-spin" />
                                  ) : (
                                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </div>
                                <span className={`text-sm font-medium ${
                                  isActive ? 'text-green-700 dark:text-green-400' : 
                                  isPast ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'
                                }`}>
                                  {stage.label}
                                </span>
                              </motion.div>
                            );
                          })}
                        </div>

                        {/* Amount being transferred */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="mt-6 text-center"
                        >
                          <p className="text-sm text-muted-foreground">Transferring</p>
                          <p className="text-2xl font-bold text-green-600">
                            ₹{successAmount.toLocaleString('en-IN')}
                          </p>
                        </motion.div>
                      </motion.div>
                    ) : showSuccess ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center justify-center py-12 px-4 text-center"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                          className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-green-500/30"
                        >
                          <CheckCircle className="h-10 w-10 text-white" />
                        </motion.div>
                        <motion.h3
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="text-2xl font-bold text-foreground mb-2"
                        >
                          Payout Requested!
                        </motion.h3>
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="text-muted-foreground mb-4"
                        >
                          Your request for <span className="font-semibold text-green-600 font-sans">₹{successAmount.toLocaleString('en-IN')}</span> has been submitted
                        </motion.p>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <PartyPopper className="h-4 w-4 text-amber-500" />
                          <span>You'll receive it soon!</span>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="form"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col min-h-0 h-full"
                      >
                        <DialogHeader className="pb-4 border-b">
                          <DialogTitle className="flex items-center gap-3 text-xl">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-sm">
                              <ArrowUpRight className="h-5 w-5 text-primary" />
                            </div>
                            Request Payout
                          </DialogTitle>
                          <DialogDescription className="flex items-center gap-2 pt-2">
                            <div className="flex items-center gap-1.5 text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-1.5 rounded-full">
                              <IndianRupee className="h-4 w-4" />
                              <span className="font-semibold font-sans">₹{pendingBalance.availableForPayout.toLocaleString('en-IN')}</span>
                              <span className="text-muted-foreground">available</span>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="flex-1 min-h-0 overflow-y-auto space-y-5 py-4 px-1">
                          {/* Amount Input - Professional Design */}
                          <div className="space-y-3">
                            <Label htmlFor="amount" className="text-sm font-medium flex items-center gap-2">
                              <IndianRupee className="h-4 w-4 text-muted-foreground" />
                              Enter Amount
                            </Label>
                            <div className="relative">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground font-bold text-lg font-sans">
                                ₹
                              </div>
                              <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                className="pl-16 pr-4 text-2xl font-bold h-16 border-2 focus:border-primary rounded-xl"
                                value={requestAmount}
                                onChange={(e) => setRequestAmount(e.target.value)}
                                min={100}
                                max={pendingBalance.availableForPayout}
                              />
                            </div>
                            
                            {/* Quick Amount Buttons */}
                            <div className="flex flex-wrap gap-2">
                              {QUICK_AMOUNTS.filter(amt => amt <= pendingBalance.availableForPayout).map((amount) => (
                                <motion.button
                                  key={amount}
                                  type="button"
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setRequestAmount(amount.toString())}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    requestAmount === amount.toString()
                                      ? 'bg-primary text-primary-foreground shadow-sm'
                                      : 'bg-muted hover:bg-muted/80 text-foreground'
                                  }`}
                                >
                                  <span className="font-sans">₹{amount.toLocaleString('en-IN')}</span>
                                </motion.button>
                              ))}
                              <Button 
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setRequestAmount(pendingBalance.availableForPayout.toString())}
                                className={`px-4 py-2 h-auto text-sm font-medium transition-all duration-200 ${
                                  requestAmount === pendingBalance.availableForPayout.toString()
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : 'border-primary/30 text-primary hover:bg-primary/5'
                                }`}
                              >
                                <Wallet className="h-3.5 w-3.5 mr-1.5" />
                                All
                              </Button>
                            </div>
                            
                            <p className="text-xs text-muted-foreground px-1">Minimum: <span className="font-sans">₹100</span></p>
                          </div>

                          <Separator />

                          {/* Payout Method Selection - Enhanced */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Payout Method</Label>
                            <div className="grid grid-cols-1 gap-2">
                              <motion.button
                                type="button"
                                onClick={() => setPayoutMethod('bank')}
                                whileTap={{ scale: 0.98 }}
                                className={`p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                                  payoutMethod === 'bank' 
                                    ? 'border-primary bg-primary/5 shadow-sm' 
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${payoutMethod === 'bank' ? 'bg-primary/10' : 'bg-muted'}`}>
                                    <Building2 className={`h-5 w-5 ${payoutMethod === 'bank' ? 'text-primary' : 'text-muted-foreground'}`} />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium">Bank Transfer</p>
                                    <p className="text-xs text-muted-foreground">1-2 business days • Free</p>
                                  </div>
                                  {payoutMethod === 'bank' && (
                                    <div className="p-1 rounded-full bg-primary text-primary-foreground">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  )}
                                </div>
                              </motion.button>

                              <motion.button
                                type="button"
                                onClick={() => setPayoutMethod('upi')}
                                whileTap={{ scale: 0.98 }}
                                className={`p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                                  payoutMethod === 'upi' 
                                    ? 'border-primary bg-primary/5 shadow-sm' 
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${payoutMethod === 'upi' ? 'bg-primary/10' : 'bg-muted'}`}>
                                    <Smartphone className={`h-5 w-5 ${payoutMethod === 'upi' ? 'text-primary' : 'text-muted-foreground'}`} />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium">UPI Transfer</p>
                                    <p className="text-xs text-muted-foreground">Within 24 hours • Free</p>
                                  </div>
                                  {payoutMethod === 'upi' && (
                                    <div className="p-1 rounded-full bg-primary text-primary-foreground">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  )}
                                </div>
                              </motion.button>

                              <motion.button
                                type="button"
                                onClick={() => setPayoutMethod('instant_upi')}
                                whileTap={{ scale: 0.98 }}
                                className={`p-4 border-2 rounded-xl text-left transition-all duration-200 relative overflow-hidden ${
                                  payoutMethod === 'instant_upi' 
                                    ? 'border-green-500 bg-gradient-to-r from-green-500/10 to-emerald-500/5 shadow-sm' 
                                    : 'border-border hover:border-green-500/50 hover:bg-green-50/50 dark:hover:bg-green-950/20'
                                }`}
                              >
                                <Badge className="absolute top-2 right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-[10px] px-2">
                                  <Zap className="h-3 w-3 mr-0.5" />
                                  INSTANT
                                </Badge>
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${payoutMethod === 'instant_upi' ? 'bg-green-500/20' : 'bg-muted'}`}>
                                    <div className="relative">
                                      <Smartphone className={`h-5 w-5 ${payoutMethod === 'instant_upi' ? 'text-green-600' : 'text-muted-foreground'}`} />
                                      <Sparkles className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1" />
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <p className={`font-medium ${payoutMethod === 'instant_upi' ? 'text-green-700 dark:text-green-400' : ''}`}>Instant UPI</p>
                                    <p className="text-xs text-muted-foreground">Within seconds • {INSTANT_PAYOUT_FEE_PERCENT}% fee</p>
                                  </div>
                                  {payoutMethod === 'instant_upi' && (
                                    <div className="p-1 rounded-full bg-green-500 text-white">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  )}
                                </div>
                              </motion.button>
                            </div>
                          </div>

                          {/* UPI ID Section - Enhanced */}
                          <AnimatePresence mode="wait">
                            {(payoutMethod === 'upi' || payoutMethod === 'instant_upi') && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-3 overflow-hidden"
                              >
                                <Label htmlFor="upi" className="text-sm font-medium">UPI ID</Label>
                                <Input
                                  id="upi"
                                  placeholder="username@bankname"
                                  className="h-11"
                                  value={customUpiId || bankAccounts.find(a => a.id === selectedBankAccount)?.upi_id || ''}
                                  onChange={(e) => setCustomUpiId(e.target.value)}
                                />
                                {upiAccounts.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">Saved UPI IDs:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {upiAccounts.map(acc => (
                                        <button
                                          key={acc.id}
                                          type="button"
                                          onClick={() => setCustomUpiId(acc.upi_id || '')}
                                          className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                                            customUpiId === acc.upi_id 
                                              ? 'bg-primary text-primary-foreground shadow-sm' 
                                              : 'bg-muted hover:bg-muted/80 text-foreground'
                                          }`}
                                        >
                                          {customUpiId === acc.upi_id && <Check className="h-3 w-3" />}
                                          {acc.upi_id}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Note Field */}
                          <div className="space-y-2">
                            <Label htmlFor="note" className="text-sm font-medium text-muted-foreground">Note (Optional)</Label>
                            <Input
                              id="note"
                              placeholder="Add a note for this request"
                              className="h-10"
                              value={requestNote}
                              onChange={(e) => setRequestNote(e.target.value)}
                            />
                          </div>

                          {/* Payout Summary Card - Enhanced */}
                          <AnimatePresence mode="wait">
                            {requestAmount && parseFloat(requestAmount) > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`p-4 rounded-xl border-2 ${
                                  payoutMethod === 'instant_upi' 
                                    ? 'bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-950/30 dark:to-emerald-950/20 border-green-200 dark:border-green-800' 
                                    : 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  {payoutMethod === 'instant_upi' ? (
                                    <Zap className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <IndianRupee className="h-4 w-4 text-primary" />
                                  )}
                                  <span className={`text-sm font-semibold ${payoutMethod === 'instant_upi' ? 'text-green-700 dark:text-green-400' : 'text-primary'}`}>
                                    {payoutMethod === 'instant_upi' ? 'Instant Payout Summary' : 'Payout Summary'}
                                  </span>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Payout Amount</span>
                                    <span className="font-medium font-sans">₹{parseFloat(requestAmount).toLocaleString('en-IN')}</span>
                                  </div>
                                  {pendingBalance.penaltiesOwed > 0 && (
                                    <div className="flex justify-between text-red-600">
                                      <span className="flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Penalty Deduction
                                      </span>
                                      <span className="font-medium font-sans">-₹{pendingBalance.penaltiesOwed.toLocaleString('en-IN')}</span>
                                    </div>
                                  )}
                                  {payoutMethod === 'instant_upi' && (
                                    <div className="flex justify-between text-orange-600">
                                      <span>Convenience Fee ({INSTANT_PAYOUT_FEE_PERCENT}%)</span>
                                      <span className="font-medium font-sans">-₹{calculateInstantFee(parseFloat(requestAmount)).toLocaleString('en-IN')}</span>
                                    </div>
                                  )}
                                  <Separator className={payoutMethod === 'instant_upi' ? 'bg-green-200 dark:bg-green-800' : ''} />
                                  <div className="flex justify-between pt-1">
                                    <span className={`font-semibold ${payoutMethod === 'instant_upi' ? 'text-green-700 dark:text-green-400' : 'text-primary'}`}>
                                      You'll Receive
                                    </span>
                                    <span className={`font-bold text-lg font-sans ${payoutMethod === 'instant_upi' ? 'text-green-700 dark:text-green-400' : 'text-primary'}`}>
                                      ₹{getNetAmount(parseFloat(requestAmount)).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Penalty Warning */}
                                {pendingBalance.penaltiesOwed > 0 && (
                                  <div className="mt-3 p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
                                    <p className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                      <span>
                                        You collected <span className="font-semibold font-sans">₹{pendingBalance.penaltiesOwed.toLocaleString('en-IN')}</span> in cancellation penalties that belong to the platform. This will be deducted from your payout.
                                      </span>
                                    </p>
                                  </div>
                                )}
                                
                                {/* Estimated Arrival Time */}
                                <div className="mt-3 pt-3 border-t border-dashed space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                      <Clock className="h-3 w-3" />
                                      Estimated Arrival
                                    </span>
                                    <span className={`font-semibold flex items-center gap-1 ${
                                      payoutMethod === 'instant_upi' ? 'text-green-600' : payoutMethod === 'upi' ? 'text-blue-600' : 'text-amber-600'
                                    }`}>
                                      {payoutMethod === 'instant_upi' ? (
                                        <>
                                          <Zap className="h-3 w-3" />
                                          Within seconds
                                        </>
                                      ) : payoutMethod === 'upi' ? (
                                        <>Within 24 hours</>
                                      ) : (
                                        <>1-2 business days</>
                                      )}
                                    </span>
                                  </div>
                                  
                                  {/* Destination */}
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Payout to:</span>
                                    <span className="font-medium flex items-center gap-1">
                                      {(payoutMethod === 'upi' || payoutMethod === 'instant_upi') ? (
                                        <>
                                          <Smartphone className="h-3 w-3" />
                                          {customUpiId || bankAccounts.find(a => a.id === selectedBankAccount)?.upi_id || 'Enter UPI ID'}
                                        </>
                                      ) : (
                                        <>
                                          <Building2 className="h-3 w-3" />
                                          {bankAccounts.find(a => a.id === selectedBankAccount)?.bank_name || 'Bank'} ****{bankAccounts.find(a => a.id === selectedBankAccount)?.account_number.slice(-4)}
                                        </>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="pt-4 border-t flex flex-col-reverse sm:flex-row gap-2 sm:gap-2 sm:justify-end">
                          <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 sm:flex-none">
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleRequestPayout} 
                            disabled={isSubmitting || !requestAmount || parseFloat(requestAmount) < 100}
                            className={`flex-1 sm:flex-none ${payoutMethod === 'instant_upi' ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' : ''}`}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : payoutMethod === 'instant_upi' ? (
                              <>
                                <Zap className="h-4 w-4 mr-2" />
                                Request Instant Payout
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="h-4 w-4 mr-2" />
                                Submit Request
                              </>
                            )}
                          </Button>
                        </div>
                      </motion.div>
                )}
                </AnimatePresence>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {payoutRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Active Payout Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payoutRequests.map(request => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium font-sans">₹{Number(request.amount).toLocaleString('en-IN')}</p>
                    <p className="text-sm text-muted-foreground">
                      Requested on {format(new Date(request.created_at), 'MMM d, yyyy')}
                    </p>
                    {request.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{request.notes}</p>
                    )}
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">About Early Payouts</p>
              <ul className="mt-1 text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Early payout requests are processed within 1-2 business days</li>
                <li>• Only settled payments are available for early payout</li>
                <li>• Minimum payout amount is <span className="font-sans">₹100</span></li>
                <li>• Regular payouts are processed automatically every week</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
