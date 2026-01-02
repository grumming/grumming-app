import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Wallet, ArrowUpRight, Clock, CheckCircle, AlertCircle, Building2, Loader2, Smartphone, Zap, Info } from 'lucide-react';
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
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Early Payout</DialogTitle>
                    <DialogDescription>
                      Enter the amount you want to withdraw. Available balance: ₹{pendingBalance.availableForPayout.toLocaleString('en-IN')}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (₹)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        value={requestAmount}
                        onChange={(e) => setRequestAmount(e.target.value)}
                        min={100}
                        max={pendingBalance.availableForPayout}
                      />
                      <p className="text-xs text-muted-foreground">Minimum: ₹100 | Maximum: ₹{pendingBalance.availableForPayout.toLocaleString('en-IN')}</p>
                    </div>

                    {/* Payout Method Selection */}
                    <div className="space-y-3">
                      <Label>Payout Method</Label>
                      <div className="grid grid-cols-1 gap-3">
                        <button
                          type="button"
                          onClick={() => setPayoutMethod('bank')}
                          className={`p-3 border rounded-lg text-left transition-colors ${
                            payoutMethod === 'bank' 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">Bank Transfer</p>
                              <p className="text-xs text-muted-foreground">1-2 business days • No fee</p>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPayoutMethod('upi')}
                          className={`p-3 border rounded-lg text-left transition-colors ${
                            payoutMethod === 'upi' 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">UPI Transfer</p>
                              <p className="text-xs text-muted-foreground">Within 24 hours • No fee</p>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPayoutMethod('instant_upi')}
                          className={`p-3 border rounded-lg text-left transition-colors relative overflow-hidden ${
                            payoutMethod === 'instant_upi' 
                              ? 'border-green-500 bg-green-500/5' 
                              : 'hover:bg-muted'
                          }`}
                        >
                          <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-medium px-2 py-0.5 rounded-bl-lg">
                            INSTANT
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Smartphone className="h-5 w-5 text-green-600" />
                              <Zap className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm text-green-600">Instant UPI Payout</p>
                              <p className="text-xs text-muted-foreground">Within seconds • {INSTANT_PAYOUT_FEE_PERCENT}% convenience fee</p>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* UPI ID Input */}
                    {(payoutMethod === 'upi' || payoutMethod === 'instant_upi') && (
                      <div className="space-y-2">
                        <Label htmlFor="upi">UPI ID</Label>
                        <Input
                          id="upi"
                          placeholder="yourname@upi"
                          value={customUpiId || bankAccounts.find(a => a.id === selectedBankAccount)?.upi_id || ''}
                          onChange={(e) => setCustomUpiId(e.target.value)}
                        />
                        {upiAccounts.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {upiAccounts.map(acc => (
                              <button
                                key={acc.id}
                                type="button"
                                onClick={() => setCustomUpiId(acc.upi_id || '')}
                                className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                              >
                                {acc.upi_id}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="note">Note (Optional)</Label>
                      <Input
                        id="note"
                        placeholder="Add a note for this request"
                        value={requestNote}
                        onChange={(e) => setRequestNote(e.target.value)}
                      />
                    </div>

                    {/* Instant Payout Fee Breakdown */}
                    {payoutMethod === 'instant_upi' && requestAmount && parseFloat(requestAmount) > 0 && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                          <Zap className="h-4 w-4" />
                          Instant Payout Breakdown
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Payout Amount</span>
                            <span>₹{parseFloat(requestAmount).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-orange-600">
                            <span>Convenience Fee ({INSTANT_PAYOUT_FEE_PERCENT}%)</span>
                            <span>-₹{calculateInstantFee(parseFloat(requestAmount)).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between font-medium text-green-600 pt-1 border-t border-green-500/20">
                            <span>You'll Receive</span>
                            <span>₹{getNetAmount(parseFloat(requestAmount)).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Payout to:</p>
                      <p className="text-sm text-muted-foreground">
                        {(payoutMethod === 'upi' || payoutMethod === 'instant_upi') ? (
                          <>UPI: {customUpiId || bankAccounts.find(a => a.id === selectedBankAccount)?.upi_id || 'Enter UPI ID'}</>
                        ) : (
                          <>{bankAccounts.find(a => a.id === selectedBankAccount)?.bank_name || 'Bank'} - ****{bankAccounts.find(a => a.id === selectedBankAccount)?.account_number.slice(-4)}</>
                        )}
                      </p>
                      {payoutMethod === 'instant_upi' && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                          <Zap className="h-3 w-3" />
                          Instant transfer within seconds
                        </div>
                      )}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleRequestPayout} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Request'
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
