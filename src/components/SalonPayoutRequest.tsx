import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Wallet, ArrowUpRight, Clock, CheckCircle, AlertCircle, Building2, Loader2, Smartphone, Zap, IndianRupee, Check, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
}

const INSTANT_PAYOUT_FEE_PERCENT = 1; // 1% convenience fee for instant payouts

export default function SalonPayoutRequest({ salonId, salonName }: SalonPayoutRequestProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [pendingBalance, setPendingBalance] = useState<PendingBalance>({ total: 0, availableForPayout: 0, pendingSettlement: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'upi' | 'instant_upi'>('bank');
  const [customUpiId, setCustomUpiId] = useState('');

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

      const totalEarned = payments?.reduce((sum, p) => sum + Number(p.salon_amount), 0) || 0;
      const totalPaidOut = completedPayouts?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const pendingRequests = requests?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      
      // All captured payments are immediately available for payout
      const availableAmount = totalEarned;
      
      // Only payments with settled_at are "fully settled", others are technically pending but available
      const settledAmount = payments?.filter(p => p.settled_at).reduce((sum, p) => sum + Number(p.salon_amount), 0) || 0;
      const pendingSettlement = totalEarned - settledAmount;
      
      setPendingBalance({
        total: totalEarned - totalPaidOut,
        availableForPayout: Math.max(0, availableAmount - totalPaidOut - pendingRequests),
        pendingSettlement: 0 // Show 0 since all captured payments are now available
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

      toast.success('Payout request submitted successfully!');
      setDialogOpen(false);
      setRequestAmount('');
      setRequestNote('');
      setCustomUpiId('');
      fetchData();
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="text-2xl font-bold">₹{pendingBalance.total.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <ArrowUpRight className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available for Payout</p>
                <p className="text-2xl font-bold text-green-600">₹{pendingBalance.availableForPayout.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Settlement</p>
                <p className="text-2xl font-bold text-amber-600">₹{pendingBalance.pendingSettlement.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
                <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
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
                        <span className="font-semibold">₹{pendingBalance.availableForPayout.toLocaleString('en-IN')}</span>
                        <span className="text-muted-foreground">available</span>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="flex-1 overflow-y-auto space-y-5 py-4 px-1">
                    {/* Amount Input - Professional Design */}
                    <div className="space-y-3">
                      <Label htmlFor="amount" className="text-sm font-medium flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        Enter Amount
                      </Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground font-bold text-lg">
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
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-muted-foreground">Minimum: ₹100</span>
                        <Button 
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRequestAmount(pendingBalance.availableForPayout.toString())}
                          className="h-7 text-xs font-medium text-primary border-primary/30 hover:bg-primary/5"
                        >
                          <Wallet className="h-3 w-3 mr-1.5" />
                          Withdraw All
                        </Button>
                      </div>
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
                              <span className="font-medium">₹{parseFloat(requestAmount).toLocaleString('en-IN')}</span>
                            </div>
                            {payoutMethod === 'instant_upi' && (
                              <div className="flex justify-between text-orange-600">
                                <span>Convenience Fee ({INSTANT_PAYOUT_FEE_PERCENT}%)</span>
                                <span className="font-medium">-₹{calculateInstantFee(parseFloat(requestAmount)).toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            <Separator className={payoutMethod === 'instant_upi' ? 'bg-green-200 dark:bg-green-800' : ''} />
                            <div className="flex justify-between pt-1">
                              <span className={`font-semibold ${payoutMethod === 'instant_upi' ? 'text-green-700 dark:text-green-400' : 'text-primary'}`}>
                                You'll Receive
                              </span>
                              <span className={`font-bold text-lg ${payoutMethod === 'instant_upi' ? 'text-green-700 dark:text-green-400' : 'text-primary'}`}>
                                ₹{getNetAmount(parseFloat(requestAmount)).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                          
                          {/* Destination */}
                          <div className="mt-3 pt-3 border-t border-dashed flex items-center justify-between text-xs">
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <DialogFooter className="pt-4 border-t gap-2 sm:gap-2">
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
                  </DialogFooter>
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
                    <p className="font-medium">₹{Number(request.amount).toLocaleString('en-IN')}</p>
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
                <li>• Minimum payout amount is ₹100</li>
                <li>• Regular payouts are processed automatically every week</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
