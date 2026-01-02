import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Plus, Trash2, Check, Loader2, 
  AlertCircle, Shield, Smartphone, Zap, Star, ChevronDown, Save, X,
  BadgeCheck, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SalonBankAccountManagerProps {
  salonId: string;
  salonName: string;
}

interface BankAccount {
  id: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string | null;
  account_type: string | null;
  upi_id: string | null;
  is_primary: boolean | null;
  is_verified: boolean | null;
  created_at: string;
}

interface BankAccountForm {
  account_holder_name: string;
  account_number: string;
  confirm_account_number: string;
  ifsc_code: string;
  bank_name: string;
  account_type: string;
  upi_id: string;
}

interface IFSCDetails {
  bank: string;
  branch: string;
  city: string;
  state: string;
}

const initialFormState: BankAccountForm = {
  account_holder_name: '',
  account_number: '',
  confirm_account_number: '',
  ifsc_code: '',
  bank_name: '',
  account_type: 'savings',
  upi_id: '',
};

type AccountMode = 'bank' | 'upi';

export function SalonBankAccountManager({ salonId, salonName }: SalonBankAccountManagerProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<BankAccountForm>(initialFormState);
  const [formErrors, setFormErrors] = useState<Partial<BankAccountForm>>({});
  const [accountMode, setAccountMode] = useState<AccountMode>('bank');
  const [ifscDetails, setIfscDetails] = useState<IFSCDetails | null>(null);
  const [isLookingUpIFSC, setIsLookingUpIFSC] = useState(false);
  const [ifscError, setIfscError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyingAccountId, setVerifyingAccountId] = useState<string | null>(null);

  useEffect(() => {
    fetchBankAccounts();
  }, [salonId]);

  // Auto-fetch bank details when IFSC code is valid
  const lookupIFSC = useCallback(async (ifsc: string) => {
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      setIfscDetails(null);
      setIfscError(null);
      return;
    }

    setIsLookingUpIFSC(true);
    setIfscError(null);

    try {
      const { data, error } = await supabase.functions.invoke('lookup-ifsc', {
        body: { ifsc },
      });

      if (error) throw error;

      if (data.valid) {
        setIfscDetails({
          bank: data.bank,
          branch: data.branch,
          city: data.city,
          state: data.state,
        });
        setFormData(prev => ({ ...prev, bank_name: data.bank }));
      } else {
        setIfscError('Invalid IFSC code');
        setIfscDetails(null);
      }
    } catch (error) {
      console.error('IFSC lookup error:', error);
      setIfscError('Could not verify IFSC code');
      setIfscDetails(null);
    } finally {
      setIsLookingUpIFSC(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.ifsc_code.length === 11) {
        lookupIFSC(formData.ifsc_code);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.ifsc_code, lookupIFSC]);

  const fetchBankAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('salon_bank_accounts')
        .select('*')
        .eq('salon_id', salonId)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toast.error('Failed to load bank accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<BankAccountForm> = {};

    if (accountMode === 'upi') {
      if (!formData.account_holder_name.trim()) {
        errors.account_holder_name = 'Name is required';
      }
      if (!formData.upi_id.trim()) {
        errors.upi_id = 'UPI ID is required';
      } else if (!/^[\w.-]+@[\w]+$/.test(formData.upi_id)) {
        errors.upi_id = 'Invalid UPI ID format (e.g., name@upi)';
      }
    } else {
      if (!formData.account_holder_name.trim()) {
        errors.account_holder_name = 'Account holder name is required';
      }

      if (!formData.account_number.trim()) {
        errors.account_number = 'Account number is required';
      } else if (!/^\d{9,18}$/.test(formData.account_number)) {
        errors.account_number = 'Invalid account number (9-18 digits)';
      }

      if (formData.account_number !== formData.confirm_account_number) {
        errors.confirm_account_number = 'Account numbers do not match';
      }

      if (!formData.ifsc_code.trim()) {
        errors.ifsc_code = 'IFSC code is required';
      } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.toUpperCase())) {
        errors.ifsc_code = 'Invalid IFSC code format';
      }

      if (formData.upi_id && !/^[\w.-]+@[\w]+$/.test(formData.upi_id)) {
        errors.upi_id = 'Invalid UPI ID format';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAccount = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const isPrimary = bankAccounts.length === 0;

      if (accountMode === 'upi') {
        const { error } = await supabase.from('salon_bank_accounts').insert({
          salon_id: salonId,
          account_holder_name: formData.account_holder_name.trim(),
          account_number: 'UPI-ONLY',
          ifsc_code: 'UPIP0000000',
          bank_name: 'UPI',
          account_type: 'upi',
          upi_id: formData.upi_id.trim(),
          is_primary: isPrimary,
        });

        if (error) throw error;
        toast.success('UPI ID added successfully for instant payouts!');
      } else {
        const { error } = await supabase.from('salon_bank_accounts').insert({
          salon_id: salonId,
          account_holder_name: formData.account_holder_name.trim(),
          account_number: formData.account_number.trim(),
          ifsc_code: formData.ifsc_code.toUpperCase().trim(),
          bank_name: formData.bank_name.trim() || null,
          account_type: formData.account_type,
          upi_id: formData.upi_id.trim() || null,
          is_primary: isPrimary,
        });

        if (error) throw error;
        toast.success('Bank account added successfully!');
      }

      setIsFormOpen(false);
      setFormData(initialFormState);
      setFormErrors({});
      setAccountMode('bank');
      fetchBankAccounts();
    } catch (error) {
      console.error('Error adding payout method:', error);
      toast.error('Failed to add payout method');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPrimary = async (accountId: string) => {
    try {
      await supabase
        .from('salon_bank_accounts')
        .update({ is_primary: false })
        .eq('salon_id', salonId);

      const { error } = await supabase
        .from('salon_bank_accounts')
        .update({ is_primary: true })
        .eq('id', accountId);

      if (error) throw error;

      toast.success('Primary account updated');
      fetchBankAccounts();
    } catch (error) {
      console.error('Error updating primary account:', error);
      toast.error('Failed to update primary account');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('salon_bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast.success('Account removed successfully');
      fetchBankAccounts();
    } catch (error) {
      console.error('Error deleting bank account:', error);
      toast.error('Failed to remove bank account');
    }
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return '••••' + accountNumber.slice(-4);
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setFormErrors({});
    setAccountMode('bank');
    setIsFormOpen(false);
    setIfscDetails(null);
    setIfscError(null);
  };

  const handleVerifyAccount = async (account: BankAccount) => {
    if (account.account_type === 'upi') {
      toast.info('UPI verification is automatic');
      return;
    }

    setIsVerifying(true);
    setVerifyingAccountId(account.id);

    try {
      const { data, error } = await supabase.functions.invoke('verify-bank-account', {
        body: {
          account_number: account.account_number,
          ifsc_code: account.ifsc_code,
          account_holder_name: account.account_holder_name,
          bank_account_id: account.id,
        },
      });

      if (error) throw error;

      if (data.verified) {
        toast.success('Bank account verified successfully!');
        fetchBankAccounts();
      } else if (data.status === 'pending') {
        toast.info('Verification in progress. Check back in a few minutes.');
      } else {
        toast.error(data.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to verify bank account');
    } finally {
      setIsVerifying(false);
      setVerifyingAccountId(null);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Payout Methods
          </h3>
          <p className="text-sm text-muted-foreground">
            Add bank account or UPI for receiving payouts
          </p>
        </div>
        {bankAccounts.length > 0 && !isFormOpen && (
          <Button size="sm" onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add New
          </Button>
        )}
      </div>

      {/* Security Badge */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <Shield className="w-5 h-5 text-emerald-600" />
        <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
          Bank-grade encryption • Your details are secure
        </span>
      </div>

      {/* Add New Form - Inline */}
      <AnimatePresence>
        {(isFormOpen || bankAccounts.length === 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
              <CardContent className="p-6 space-y-6">
                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMode('bank');
                      setFormData(initialFormState);
                      setFormErrors({});
                    }}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                      accountMode === 'bank'
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    {accountMode === 'bank' && (
                      <motion.div
                        layoutId="modeIndicator"
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                      </motion.div>
                    )}
                    <Building2 className={`w-7 h-7 mb-2 ${accountMode === 'bank' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="font-semibold">Bank Account</p>
                    <p className="text-xs text-muted-foreground mt-0.5">NEFT/IMPS transfer • 1-3 days</p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMode('upi');
                      setFormData(initialFormState);
                      setFormErrors({});
                    }}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                      accountMode === 'upi'
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    {accountMode === 'upi' && (
                      <motion.div
                        layoutId="modeIndicator"
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                      </motion.div>
                    )}
                    <div className="flex items-center gap-1.5 mb-2">
                      <Smartphone className={`w-7 h-7 ${accountMode === 'upi' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <Zap className={`w-5 h-5 ${accountMode === 'upi' ? 'text-yellow-500' : 'text-muted-foreground/50'}`} />
                    </div>
                    <p className="font-semibold">UPI ID</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Instant payout • Within seconds</p>
                  </button>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {accountMode === 'upi' ? (
                    <>
                      {/* Instant Payout Banner */}
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-green-500/15 to-emerald-500/10 border border-green-500/30">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-700 dark:text-green-400">Instant Payouts Enabled</p>
                          <p className="text-xs text-muted-foreground">Get paid directly to UPI within seconds</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="upi_holder_name" className="text-sm font-medium">
                          Account Holder Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="upi_holder_name"
                          placeholder="Enter your full name"
                          value={formData.account_holder_name}
                          onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                          className={`h-12 text-base ${formErrors.account_holder_name ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        />
                        {formErrors.account_holder_name && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.account_holder_name}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="upi_id" className="text-sm font-medium">
                          UPI ID <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="upi_id"
                          placeholder="yourname@paytm, mobile@upi, etc."
                          value={formData.upi_id}
                          onChange={(e) => setFormData({ ...formData, upi_id: e.target.value.toLowerCase() })}
                          className={`h-12 text-base ${formErrors.upi_id ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        />
                        {formErrors.upi_id && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.upi_id}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Works with GPay, PhonePe, Paytm, BHIM, and all UPI apps
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="account_holder_name" className="text-sm font-medium">
                          Account Holder Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="account_holder_name"
                          placeholder="Name as per bank records"
                          value={formData.account_holder_name}
                          onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                          className={`h-12 text-base ${formErrors.account_holder_name ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        />
                        {formErrors.account_holder_name && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.account_holder_name}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="account_number" className="text-sm font-medium">
                          Account Number <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="account_number"
                          placeholder="Enter your account number"
                          value={formData.account_number}
                          onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, '') })}
                          className={`h-12 text-base font-mono ${formErrors.account_number ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        />
                        {formErrors.account_number && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.account_number}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm_account_number" className="text-sm font-medium">
                          Confirm Account Number <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="confirm_account_number"
                          placeholder="Re-enter account number"
                          value={formData.confirm_account_number}
                          onChange={(e) => setFormData({ ...formData, confirm_account_number: e.target.value.replace(/\D/g, '') })}
                          className={`h-12 text-base font-mono ${formErrors.confirm_account_number ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        />
                        {formErrors.confirm_account_number && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.confirm_account_number}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ifsc_code" className="text-sm font-medium">
                            IFSC Code <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="ifsc_code"
                              placeholder="e.g., HDFC0001234"
                              value={formData.ifsc_code}
                              onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                              className={`h-12 text-base font-mono uppercase pr-10 ${formErrors.ifsc_code || ifscError ? 'border-destructive focus-visible:ring-destructive' : ifscDetails ? 'border-emerald-500 focus-visible:ring-emerald-500' : ''}`}
                              maxLength={11}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {isLookingUpIFSC && (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                              )}
                              {!isLookingUpIFSC && ifscDetails && (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              )}
                              {!isLookingUpIFSC && ifscError && (
                                <XCircle className="w-5 h-5 text-destructive" />
                              )}
                            </div>
                          </div>
                          {formErrors.ifsc_code && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {formErrors.ifsc_code}
                            </p>
                          )}
                          {ifscError && !formErrors.ifsc_code && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {ifscError}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="account_type" className="text-sm font-medium">
                            Account Type
                          </Label>
                          <Select
                            value={formData.account_type}
                            onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="savings">Savings</SelectItem>
                              <SelectItem value="current">Current</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Auto-fetched Bank Details */}
                      <AnimatePresence>
                        {ifscDetails && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                              <div className="space-y-1">
                                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                                  {ifscDetails.bank}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {ifscDetails.branch}, {ifscDetails.city}, {ifscDetails.state}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="space-y-2">
                        <Label htmlFor="bank_name" className="text-sm font-medium flex items-center gap-2">
                          Bank Name
                          {ifscDetails && (
                            <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-600">
                              Auto-filled
                            </Badge>
                          )}
                        </Label>
                        <Input
                          id="bank_name"
                          placeholder="e.g., HDFC Bank, SBI, ICICI"
                          value={formData.bank_name}
                          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                          className="h-12 text-base"
                          disabled={!!ifscDetails}
                        />
                      </div>

                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center gap-2 text-sm text-primary hover:underline">
                            <ChevronDown className="w-4 h-4" />
                            Add UPI ID for faster payouts (optional)
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3">
                          <div className="space-y-2">
                            <Label htmlFor="bank_upi_id" className="text-sm font-medium">
                              UPI ID (Optional)
                            </Label>
                            <Input
                              id="bank_upi_id"
                              placeholder="e.g., yourname@upi"
                              value={formData.upi_id}
                              onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                              className={`h-12 text-base ${formErrors.upi_id ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                            />
                            {formErrors.upi_id && (
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {formErrors.upi_id}
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Button 
                    onClick={handleSaveAccount} 
                    disabled={isSubmitting}
                    className="flex-1 h-12 text-base font-semibold gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {accountMode === 'upi' ? 'Save UPI ID' : 'Save Bank Account'}
                      </>
                    )}
                  </Button>
                  {bankAccounts.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={resetForm}
                      className="h-12 px-6"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Accounts List */}
      {bankAccounts.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground px-1">
            Saved Payout Methods ({bankAccounts.length})
          </p>
          {bankAccounts.map((account, index) => {
            const isUpiOnly = account.account_type === 'upi';
            
            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`transition-all ${
                  account.is_primary 
                    ? 'border-primary bg-gradient-to-br from-primary/5 to-transparent shadow-md' 
                    : 'hover:border-primary/30'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isUpiOnly 
                            ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10' 
                            : 'bg-gradient-to-br from-primary/20 to-primary/5'
                        }`}>
                          {isUpiOnly ? (
                            <Smartphone className="w-6 h-6 text-green-600" />
                          ) : (
                            <Building2 className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{account.account_holder_name}</p>
                            {account.is_primary && (
                              <Badge className="bg-primary/20 text-primary border-0 gap-1">
                                <Star className="w-3 h-3 fill-current" />
                                Primary
                              </Badge>
                            )}
                            {isUpiOnly && (
                              <Badge variant="outline" className="border-green-500/50 text-green-600 gap-1">
                                <Zap className="w-3 h-3" />
                                Instant
                              </Badge>
                            )}
                            {account.is_verified && (
                              <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 gap-1">
                                <Check className="w-3 h-3" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          
                          {isUpiOnly ? (
                            <p className="text-sm text-muted-foreground font-mono">
                              {account.upi_id}
                            </p>
                          ) : (
                            <div className="space-y-0.5">
                              <p className="text-sm text-muted-foreground">
                                {account.bank_name || 'Bank Account'} • {maskAccountNumber(account.account_number)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                IFSC: {account.ifsc_code}
                                {account.upi_id && ` • UPI: ${account.upi_id}`}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Verify Button for unverified bank accounts */}
                        {!isUpiOnly && !account.is_verified && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerifyAccount(account)}
                            disabled={isVerifying && verifyingAccountId === account.id}
                            className="text-xs h-8 px-3 gap-1.5 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                          >
                            {isVerifying && verifyingAccountId === account.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              <>
                                <BadgeCheck className="w-3 h-3" />
                                Verify
                              </>
                            )}
                          </Button>
                        )}
                        {!account.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimary(account.id)}
                            className="text-xs h-8 px-3"
                          >
                            Set Primary
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Payout Method?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove {isUpiOnly ? 'UPI ID' : 'bank account'} "{account.account_holder_name}" 
                                from your payout methods. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAccount(account.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty State Help */}
      {bankAccounts.length === 0 && !isFormOpen && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h4 className="font-medium mb-2">No payout method added</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Add a bank account or UPI ID to receive your earnings
            </p>
            <Button onClick={() => setIsFormOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Payout Method
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}