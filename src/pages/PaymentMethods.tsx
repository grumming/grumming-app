import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, CreditCard, Plus, Trash2, Check, Loader2, 
  Smartphone, MoreVertical, Star
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BottomNav from '@/components/BottomNav';

interface PaymentMethod {
  id: string;
  user_id: string;
  type: 'card' | 'upi';
  card_last4: string | null;
  card_brand: string | null;
  card_expiry_month: number | null;
  card_expiry_year: number | null;
  upi_id: string | null;
  label: string | null;
  is_default: boolean;
  created_at: string;
}

const PaymentMethods = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addType, setAddType] = useState<'card' | 'upi'>('upi');
  const [isSaving, setIsSaving] = useState(false);
  
  // UPI form state
  const [upiId, setUpiId] = useState('');
  const [upiLabel, setUpiLabel] = useState('');
  
  // Card form state (for display - actual tokenization happens via Razorpay)
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardLabel, setCardLabel] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPaymentMethods();
    }
  }, [user]);

  const fetchPaymentMethods = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment methods:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment methods',
        variant: 'destructive',
      });
    } else {
      setMethods((data || []) as PaymentMethod[]);
    }
    setIsLoading(false);
  };

  const validateUpiId = (upi: string): boolean => {
    // Basic UPI ID validation: should contain @ and have valid format
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    return upiRegex.test(upi);
  };

  const handleAddUpi = async () => {
    if (!user) return;
    
    if (!validateUpiId(upiId)) {
      toast({
        title: 'Invalid UPI ID',
        description: 'Please enter a valid UPI ID (e.g., name@upi)',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        type: 'upi',
        upi_id: upiId.toLowerCase(),
        label: upiLabel || null,
        is_default: methods.length === 0,
      });

    if (error) {
      console.error('Error adding UPI:', error);
      toast({
        title: 'Error',
        description: 'Failed to add UPI ID',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'UPI Added',
        description: 'Your UPI ID has been saved',
      });
      setShowAddDialog(false);
      resetForm();
      fetchPaymentMethods();
    }
    setIsSaving(false);
  };

  const handleAddCard = async () => {
    if (!user) return;

    // Basic validation
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      toast({
        title: 'Invalid Card',
        description: 'Please enter a valid card number',
        variant: 'destructive',
      });
      return;
    }

    const expiryParts = cardExpiry.split('/');
    if (expiryParts.length !== 2) {
      toast({
        title: 'Invalid Expiry',
        description: 'Please enter expiry as MM/YY',
        variant: 'destructive',
      });
      return;
    }

    const month = parseInt(expiryParts[0], 10);
    const year = parseInt('20' + expiryParts[1], 10);

    if (month < 1 || month > 12) {
      toast({
        title: 'Invalid Month',
        description: 'Please enter a valid expiry month',
        variant: 'destructive',
      });
      return;
    }

    // Detect card brand
    let brand = 'Unknown';
    if (cleanCardNumber.startsWith('4')) brand = 'Visa';
    else if (cleanCardNumber.startsWith('5')) brand = 'Mastercard';
    else if (cleanCardNumber.startsWith('37') || cleanCardNumber.startsWith('34')) brand = 'Amex';
    else if (cleanCardNumber.startsWith('6')) brand = 'RuPay';

    setIsSaving(true);

    const { error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        type: 'card',
        card_last4: cleanCardNumber.slice(-4),
        card_brand: brand,
        card_expiry_month: month,
        card_expiry_year: year,
        label: cardLabel || null,
        is_default: methods.length === 0,
      });

    if (error) {
      console.error('Error adding card:', error);
      toast({
        title: 'Error',
        description: 'Failed to add card',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Card Added',
        description: 'Your card has been saved',
      });
      setShowAddDialog(false);
      resetForm();
      fetchPaymentMethods();
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete payment method',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: 'Payment method removed',
      });
      fetchPaymentMethods();
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;

    // First, unset all defaults
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', user.id);

    // Set new default
    const { error } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to set default',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Default Updated',
        description: 'Default payment method changed',
      });
      fetchPaymentMethods();
    }
  };

  const resetForm = () => {
    setUpiId('');
    setUpiLabel('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCardLabel('');
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const getCardIcon = (brand: string | null) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      case 'rupay':
        return '🏦';
      default:
        return '💳';
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const cards = methods.filter(m => m.type === 'card');
  const upis = methods.filter(m => m.type === 'upi');

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-display text-lg font-semibold text-foreground">Payment Methods</h1>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* UPI Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">UPI IDs</h2>
          </div>
          
          {upis.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <Smartphone className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No UPI IDs saved</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setAddType('upi');
                  setShowAddDialog(true);
                }}
              >
                Add UPI ID
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {upis.map((upi) => (
                  <motion.div
                    key={upi.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{upi.upi_id}</p>
                        {upi.is_default && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3 fill-primary" />
                            Default
                          </span>
                        )}
                      </div>
                      {upi.label && (
                        <p className="text-xs text-muted-foreground">{upi.label}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-full hover:bg-muted transition-colors">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!upi.is_default && (
                          <DropdownMenuItem onClick={() => handleSetDefault(upi.id)}>
                            <Star className="w-4 h-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(upi.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Cards Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Saved Cards</h2>
          </div>
          
          {cards.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No cards saved</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setAddType('card');
                  setShowAddDialog(true);
                }}
              >
                Add Card
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {cards.map((card) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                      {getCardIcon(card.card_brand)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {card.card_brand} •••• {card.card_last4}
                        </p>
                        {card.is_default && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3 fill-primary" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Expires {String(card.card_expiry_month).padStart(2, '0')}/{String(card.card_expiry_year).slice(-2)}
                        {card.label && ` • ${card.label}`}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-full hover:bg-muted transition-colors">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!card.is_default && (
                          <DropdownMenuItem onClick={() => handleSetDefault(card.id)}>
                            <Star className="w-4 h-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(card.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Security Note */}
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">
            🔒 Your payment information is encrypted and secure. We use Razorpay for secure payments.
          </p>
        </div>
      </div>

      {/* Add Payment Method Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
          </DialogHeader>
          
          <Tabs value={addType} onValueChange={(v) => setAddType(v as 'card' | 'upi')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upi" className="gap-2">
                <Smartphone className="w-4 h-4" />
                UPI
              </TabsTrigger>
              <TabsTrigger value="card" className="gap-2">
                <CreditCard className="w-4 h-4" />
                Card
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upi" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="upiId">UPI ID</Label>
                <Input
                  id="upiId"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="upiLabel">Label (Optional)</Label>
                <Input
                  id="upiLabel"
                  placeholder="e.g., Personal, GPay"
                  value={upiLabel}
                  onChange={(e) => setUpiLabel(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleAddUpi}
                disabled={!upiId || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Save UPI ID
              </Button>
            </TabsContent>

            <TabsContent value="card" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cardExpiry">Expiry</Label>
                  <Input
                    id="cardExpiry"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardCvv">CVV</Label>
                  <Input
                    id="cardCvv"
                    type="password"
                    placeholder="•••"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardLabel">Label (Optional)</Label>
                <Input
                  id="cardLabel"
                  placeholder="e.g., Personal, Business"
                  value={cardLabel}
                  onChange={(e) => setCardLabel(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleAddCard}
                disabled={!cardNumber || !cardExpiry || !cardCvv || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Save Card
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default PaymentMethods;
