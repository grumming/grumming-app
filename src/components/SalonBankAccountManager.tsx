import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, Plus, Trash2, Check, Loader2, CreditCard, 
  AlertCircle, Shield, Edit2, X, Smartphone, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<BankAccountForm>(initialFormState);
  const [formErrors, setFormErrors] = useState<Partial<BankAccountForm>>({});
  const [accountMode, setAccountMode] = useState<AccountMode>('bank');

  useEffect(() => {
    fetchBankAccounts();
  }, [salonId]);

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
      // UPI-only validation
      if (!formData.account_holder_name.trim()) {
        errors.account_holder_name = 'Name is required';
      }
      if (!formData.upi_id.trim()) {
        errors.upi_id = 'UPI ID is required';
      } else if (!/^[\w.-]+@[\w]+$/.test(formData.upi_id)) {
        errors.upi_id = 'Invalid UPI ID format (e.g., name@upi)';
      }
    } else {
      // Bank account validation
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

  const handleAddBankAccount = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const isPrimary = bankAccounts.length === 0;

      if (accountMode === 'upi') {
        // Add UPI-only payout method
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
        toast.success('UPI ID added successfully for instant payouts');
      } else {
        // Add bank account
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
        toast.success('Bank account added successfully');
      }

      setIsAddDialogOpen(false);
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
      // First, unset all as primary
      await supabase
        .from('salon_bank_accounts')
        .update({ is_primary: false })
        .eq('salon_id', salonId);

      // Then set the selected one as primary
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

      toast.success('Bank account removed');
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
          <h3 className="text-lg font-semibold">Bank Accounts</h3>
          <p className="text-sm text-muted-foreground">
            Manage your payout destinations
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setFormData(initialFormState);
            setFormErrors({});
            setAccountMode('bank');
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Payout Method</DialogTitle>
              <DialogDescription>
                Choose how you want to receive payouts
              </DialogDescription>
            </DialogHeader>
            
            {/* Mode Selection */}
            <div className="grid grid-cols-2 gap-3 py-2">
              <button
                type="button"
                onClick={() => {
                  setAccountMode('bank');
                  setFormData(initialFormState);
                  setFormErrors({});
                }}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  accountMode === 'bank'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Building2 className={`w-6 h-6 mb-2 ${accountMode === 'bank' ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="font-medium text-sm">Bank Account</p>
                <p className="text-xs text-muted-foreground mt-1">NEFT/IMPS transfer</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountMode('upi');
                  setFormData(initialFormState);
                  setFormErrors({});
                }}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  accountMode === 'upi'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-1 mb-2">
                  <Smartphone className={`w-6 h-6 ${accountMode === 'upi' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Zap className={`w-4 h-4 ${accountMode === 'upi' ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                </div>
                <p className="font-medium text-sm">UPI ID</p>
                <p className="text-xs text-muted-foreground mt-1">Instant payout</p>
              </button>
            </div>

            <div className="space-y-4 py-2">
              {accountMode === 'upi' ? (
                <>
                  {/* UPI Only Form */}
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <Zap className="w-4 h-4" />
                      <span className="font-medium">Instant Payouts</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Receive payouts directly to your UPI ID within seconds
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="upi_holder_name">Name *</Label>
                    <Input
                      id="upi_holder_name"
                      placeholder="Enter your name"
                      value={formData.account_holder_name}
                      onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                      className={formErrors.account_holder_name ? 'border-destructive' : ''}
                    />
                    {formErrors.account_holder_name && (
                      <p className="text-xs text-destructive">{formErrors.account_holder_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="upi_id">UPI ID *</Label>
                    <Input
                      id="upi_id"
                      placeholder="e.g., yourname@paytm, mobile@upi"
                      value={formData.upi_id}
                      onChange={(e) => setFormData({ ...formData, upi_id: e.target.value.toLowerCase() })}
                      className={formErrors.upi_id ? 'border-destructive' : ''}
                    />
                    {formErrors.upi_id && (
                      <p className="text-xs text-destructive">{formErrors.upi_id}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enter your UPI ID linked to any UPI app (GPay, PhonePe, Paytm, etc.)
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Bank Account Form */}
                  <div className="space-y-2">
                    <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                    <Input
                      id="account_holder_name"
                      placeholder="Enter name as per bank records"
                      value={formData.account_holder_name}
                      onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                      className={formErrors.account_holder_name ? 'border-destructive' : ''}
                    />
                    {formErrors.account_holder_name && (
                      <p className="text-xs text-destructive">{formErrors.account_holder_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_number">Account Number *</Label>
                    <Input
                      id="account_number"
                      placeholder="Enter account number"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, '') })}
                      className={formErrors.account_number ? 'border-destructive' : ''}
                    />
                    {formErrors.account_number && (
                      <p className="text-xs text-destructive">{formErrors.account_number}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_account_number">Confirm Account Number *</Label>
                    <Input
                      id="confirm_account_number"
                      placeholder="Re-enter account number"
                      value={formData.confirm_account_number}
                      onChange={(e) => setFormData({ ...formData, confirm_account_number: e.target.value.replace(/\D/g, '') })}
                      className={formErrors.confirm_account_number ? 'border-destructive' : ''}
                    />
                    {formErrors.confirm_account_number && (
                      <p className="text-xs text-destructive">{formErrors.confirm_account_number}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ifsc_code">IFSC Code *</Label>
                      <Input
                        id="ifsc_code"
                        placeholder="e.g., HDFC0001234"
                        value={formData.ifsc_code}
                        onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                        className={formErrors.ifsc_code ? 'border-destructive' : ''}
                        maxLength={11}
                      />
                      {formErrors.ifsc_code && (
                        <p className="text-xs text-destructive">{formErrors.ifsc_code}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="account_type">Account Type</Label>
                      <Select
                        value={formData.account_type}
                        onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="savings">Savings</SelectItem>
                          <SelectItem value="current">Current</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      placeholder="e.g., HDFC Bank"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_upi_id">UPI ID (Optional)</Label>
                    <Input
                      id="bank_upi_id"
                      placeholder="e.g., yourname@upi"
                      value={formData.upi_id}
                      onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                      className={formErrors.upi_id ? 'border-destructive' : ''}
                    />
                    {formErrors.upi_id && (
                      <p className="text-xs text-destructive">{formErrors.upi_id}</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddBankAccount} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  accountMode === 'upi' ? 'Add UPI ID' : 'Add Account'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Security Notice */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Shield className="w-4 h-4" />
            <span>Your bank details are encrypted and securely stored</span>
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts List */}
      {bankAccounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h4 className="font-medium mb-2">No bank accounts added</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Add a bank account to receive payouts
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bankAccounts.map((account, index) => {
            const isUpiOnly = account.account_type === 'upi';
            
            return (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={account.is_primary ? 'border-primary/50 bg-primary/5' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mt-1 ${
                        isUpiOnly ? 'bg-green-500/10' : 'bg-primary/10'
                      }`}>
                        {isUpiOnly ? (
                          <Smartphone className="w-5 h-5 text-green-600" />
                        ) : (
                          <Building2 className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{account.account_holder_name}</p>
                          {account.is_primary && (
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          )}
                          {isUpiOnly && (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs gap-1">
                              <Zap className="w-3 h-3" />
                              Instant
                            </Badge>
                          )}
                          {account.is_verified && (
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                        {isUpiOnly ? (
                          <p className="text-sm text-muted-foreground">
                            UPI ID: {account.upi_id}
                          </p>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">
                              {account.bank_name || 'Bank'} • {maskAccountNumber(account.account_number)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              IFSC: {account.ifsc_code} • {account.account_type?.charAt(0).toUpperCase()}{account.account_type?.slice(1)}
                            </p>
                            {account.upi_id && (
                              <p className="text-xs text-muted-foreground mt-1">
                                UPI: {account.upi_id}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!account.is_primary && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetPrimary(account.id)}
                          className="text-xs"
                        >
                          Set as Primary
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Bank Account?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the bank account ending in {account.account_number.slice(-4)}. 
                              You can add it again later if needed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteAccount(account.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">About Payouts</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Payouts are processed weekly to your primary account</li>
                <li>Minimum payout amount is ₹100</li>
                <li>Bank transfers typically take 1-2 business days</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
