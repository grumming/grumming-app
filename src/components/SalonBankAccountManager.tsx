import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Plus, Trash2, Check, Loader2, 
  AlertCircle, Shield, Smartphone, Zap, Star, ChevronDown, Save, X,
  CheckCircle2, XCircle, CreditCard, Wallet, ArrowRight, Sparkles
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

  useEffect(() => {
    fetchBankAccounts();
  }, [salonId]);

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
        toast.success('UPI ID added successfully!');
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 rounded-2xl bg-gradient-to-r from-muted/50 to-muted/30 animate-pulse" />
        <div className="h-32 rounded-2xl bg-gradient-to-r from-muted/40 to-muted/20 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
              <Wallet className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Payout Methods</h3>
              <p className="text-sm text-muted-foreground">
                Receive your earnings securely
              </p>
            </div>
          </div>
        </div>
        {bankAccounts.length > 0 && !isFormOpen && (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={() => setIsFormOpen(true)} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              Add New
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Security Badge - Premium */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-green-500/15 to-teal-500/20" />
        <div className="relative flex items-center gap-3 px-5 py-4 backdrop-blur-sm border border-emerald-500/30">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Bank-Grade Security
            </p>
            <p className="text-xs text-muted-foreground">
              256-bit encryption • Your data is protected
            </p>
          </div>
          <Sparkles className="w-5 h-5 text-emerald-500/60" />
        </div>
      </motion.div>

      {/* Add New Form */}
      <AnimatePresence mode="wait">
        {(isFormOpen || bankAccounts.length === 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <Card className="relative overflow-hidden border-2 border-primary/20 shadow-xl shadow-primary/5">
              {/* Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
              
              <CardContent className="relative p-6 space-y-6">
                {/* Mode Selector - Enhanced */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { 
                      mode: 'bank' as const, 
                      icon: Building2, 
                      title: 'Bank Account', 
                      desc: 'NEFT/IMPS • 1-3 days',
                      gradient: 'from-blue-500/20 to-indigo-500/10'
                    },
                    { 
                      mode: 'upi' as const, 
                      icon: Smartphone, 
                      title: 'UPI ID', 
                      desc: 'Instant payout',
                      gradient: 'from-green-500/20 to-emerald-500/10',
                      badge: 'Recommended'
                    }
                  ].map((option) => (
                    <motion.button
                      key={option.mode}
                      type="button"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setAccountMode(option.mode);
                        setFormData(initialFormState);
                        setFormErrors({});
                      }}
                      className={`relative p-5 rounded-2xl border-2 transition-all text-left ${
                        accountMode === option.mode
                          ? 'border-primary bg-gradient-to-br ' + option.gradient + ' shadow-lg'
                          : 'border-border bg-card/50 hover:border-primary/40 hover:bg-muted/30'
                      }`}
                    >
                      {accountMode === option.mode && (
                        <motion.div
                          layoutId="modeIndicator"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg"
                        >
                          <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                        </motion.div>
                      )}
                      
                      {option.badge && (
                        <Badge className="absolute top-2 right-2 text-[10px] bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                          {option.badge}
                        </Badge>
                      )}
                      
                      <div className="flex items-center gap-2 mb-3">
                        <option.icon className={`w-7 h-7 ${accountMode === option.mode ? 'text-primary' : 'text-muted-foreground'}`} />
                        {option.mode === 'upi' && (
                          <Zap className={`w-4 h-4 ${accountMode === 'upi' ? 'text-yellow-500' : 'text-muted-foreground/40'}`} />
                        )}
                      </div>
                      <p className="font-semibold text-foreground">{option.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{option.desc}</p>
                    </motion.button>
                  ))}
                </div>

                {/* Form Fields */}
                <motion.div 
                  key={accountMode}
                  initial={{ opacity: 0, x: accountMode === 'upi' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  {accountMode === 'upi' ? (
                    <>
                      {/* Instant Payout Banner */}
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/20">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                          <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-green-700 dark:text-green-400">
                            Instant Payouts
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Receive money directly to UPI within seconds
                          </p>
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
                          className={`h-12 text-base rounded-xl bg-background/50 ${formErrors.account_holder_name ? 'border-destructive focus-visible:ring-destructive' : 'border-border/50'}`}
                        />
                        {formErrors.account_holder_name && (
                          <motion.p 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-destructive flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.account_holder_name}
                          </motion.p>
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
                          className={`h-12 text-base rounded-xl bg-background/50 font-mono ${formErrors.upi_id ? 'border-destructive focus-visible:ring-destructive' : 'border-border/50'}`}
                        />
                        {formErrors.upi_id && (
                          <motion.p 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-destructive flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.upi_id}
                          </motion.p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          Works with GPay, PhonePe, Paytm, BHIM & all UPI apps
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
                          className={`h-12 text-base rounded-xl bg-background/50 ${formErrors.account_holder_name ? 'border-destructive focus-visible:ring-destructive' : 'border-border/50'}`}
                        />
                        {formErrors.account_holder_name && (
                          <motion.p 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-destructive flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.account_holder_name}
                          </motion.p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="account_number" className="text-sm font-medium">
                            Account Number <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="account_number"
                            placeholder="Enter account number"
                            value={formData.account_number}
                            onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, '') })}
                            className={`h-12 text-base font-mono rounded-xl bg-background/50 ${formErrors.account_number ? 'border-destructive focus-visible:ring-destructive' : 'border-border/50'}`}
                          />
                          {formErrors.account_number && (
                            <motion.p 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-destructive flex items-center gap-1"
                            >
                              <AlertCircle className="w-3 h-3" />
                              {formErrors.account_number}
                            </motion.p>
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
                            className={`h-12 text-base font-mono rounded-xl bg-background/50 ${formErrors.confirm_account_number ? 'border-destructive focus-visible:ring-destructive' : 'border-border/50'}`}
                          />
                          {formErrors.confirm_account_number && (
                            <motion.p 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-destructive flex items-center gap-1"
                            >
                              <AlertCircle className="w-3 h-3" />
                              {formErrors.confirm_account_number}
                            </motion.p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                              className={`h-12 text-base font-mono uppercase pr-10 rounded-xl bg-background/50 ${formErrors.ifsc_code || ifscError ? 'border-destructive focus-visible:ring-destructive' : ifscDetails ? 'border-emerald-500 focus-visible:ring-emerald-500' : 'border-border/50'}`}
                              maxLength={11}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {isLookingUpIFSC && (
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
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
                            <motion.p 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-destructive flex items-center gap-1"
                            >
                              <AlertCircle className="w-3 h-3" />
                              {formErrors.ifsc_code}
                            </motion.p>
                          )}
                          {ifscError && !formErrors.ifsc_code && (
                            <motion.p 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-destructive flex items-center gap-1"
                            >
                              <AlertCircle className="w-3 h-3" />
                              {ifscError}
                            </motion.p>
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
                            <SelectTrigger className="h-12 rounded-xl bg-background/50 border-border/50">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="savings">Savings Account</SelectItem>
                              <SelectItem value="current">Current Account</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Auto-fetched Bank Details */}
                      <AnimatePresence>
                        {ifscDetails && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              </div>
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
                            <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-600 bg-emerald-500/10">
                              Auto-filled
                            </Badge>
                          )}
                        </Label>
                        <Input
                          id="bank_name"
                          placeholder="e.g., HDFC Bank, SBI, ICICI"
                          value={formData.bank_name}
                          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                          className="h-12 text-base rounded-xl bg-background/50 border-border/50"
                          disabled={!!ifscDetails}
                        />
                      </div>

                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center gap-2 text-sm text-primary hover:underline transition-all">
                            <ChevronDown className="w-4 h-4" />
                            Add UPI ID for faster payouts (optional)
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-4">
                          <div className="space-y-2">
                            <Label htmlFor="bank_upi_id" className="text-sm font-medium">
                              UPI ID (Optional)
                            </Label>
                            <Input
                              id="bank_upi_id"
                              placeholder="e.g., yourname@upi"
                              value={formData.upi_id}
                              onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                              className={`h-12 text-base rounded-xl bg-background/50 ${formErrors.upi_id ? 'border-destructive focus-visible:ring-destructive' : 'border-border/50'}`}
                            />
                            {formErrors.upi_id && (
                              <motion.p 
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xs text-destructive flex items-center gap-1"
                              >
                                <AlertCircle className="w-3 h-3" />
                                {formErrors.upi_id}
                              </motion.p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </>
                  )}
                </motion.div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <motion.div className="flex-1" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Button 
                      onClick={handleSaveAccount} 
                      disabled={isSubmitting}
                      className="w-full h-12 text-base font-semibold gap-2 rounded-xl shadow-lg shadow-primary/20"
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
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                  {bankAccounts.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={resetForm}
                      className="h-12 px-4 rounded-xl"
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
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-foreground">
              Saved Payout Methods
            </p>
            <Badge variant="outline" className="rounded-full text-xs font-medium">
              {bankAccounts.length} {bankAccounts.length === 1 ? 'account' : 'accounts'}
            </Badge>
          </div>
          
          <div className="space-y-3">
            {bankAccounts.map((account, index) => {
              const isUpiOnly = account.account_type === 'upi';
              
              return (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <Card className={`relative overflow-hidden transition-all duration-200 ${
                    account.is_primary 
                      ? 'border-primary bg-gradient-to-br from-primary/5 via-background to-primary/3 shadow-md' 
                      : 'bg-card hover:shadow-sm'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          isUpiOnly 
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-md shadow-green-500/20' 
                            : 'bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/20'
                        }`}>
                          {isUpiOnly ? (
                            <Smartphone className="w-5 h-5 text-white" />
                          ) : (
                            <Building2 className="w-5 h-5 text-primary-foreground" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-foreground truncate">{account.account_holder_name}</p>
                          </div>
                          
                          {/* Badges Row */}
                          <div className="flex items-center gap-1.5 flex-wrap mb-2">
                            {account.is_primary && (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px] px-2 py-0.5 rounded-full">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                Primary
                              </Badge>
                            )}
                            {isUpiOnly && (
                              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 gap-1 text-[11px] px-2 py-0.5 rounded-full">
                                <Zap className="w-2.5 h-2.5" />
                                Instant
                              </Badge>
                            )}
                            {account.is_verified && (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          
                          {/* Account Details */}
                          {isUpiOnly ? (
                            <p className="text-sm text-muted-foreground font-mono bg-muted/50 px-2.5 py-1 rounded-md inline-block">
                              {account.upi_id}
                            </p>
                          ) : (
                            <div className="space-y-0.5">
                              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                <span className="text-foreground/70">{account.bank_name || 'Bank'}</span>
                                <span className="text-muted-foreground/50">•</span>
                                <span className="font-mono text-foreground/80">{maskAccountNumber(account.account_number)}</span>
                              </p>
                              {account.upi_id && (
                                <p className="text-xs text-muted-foreground">
                                  UPI: <span className="font-mono">{account.upi_id}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!account.is_primary && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetPrimary(account.id)}
                              className="text-xs h-8 px-2.5 rounded-lg hover:bg-primary/10 hover:text-primary font-medium"
                            >
                              Set Primary
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl max-w-sm">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Payout Method?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove {isUpiOnly ? 'UPI ID' : 'bank account'} for "{account.account_holder_name}". 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteAccount(account.id)}
                                  className="bg-destructive hover:bg-destructive/90 rounded-xl"
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
        </motion.div>
      )}

      {/* Empty State */}
      {bankAccounts.length === 0 && !isFormOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-dashed border-2 border-muted-foreground/20">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h4 className="font-semibold text-lg mb-2">No payout method added</h4>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Add a bank account or UPI ID to start receiving your earnings securely
              </p>
              <Button onClick={() => setIsFormOpen(true)} className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" />
                Add Payout Method
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
