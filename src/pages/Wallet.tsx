import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Wallet as WalletIcon, TrendingUp, TrendingDown, Gift, Loader2, ArrowUpRight, ArrowDownLeft, Plus, CreditCard, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';


declare global {
  interface Window {
    Razorpay: any;
  }
}

const categoryLabels: Record<string, string> = {
  referral_bonus: 'Referral Bonus',
  referee_bonus: 'Welcome Bonus',
  promo_code: 'Promo Code',
  booking_discount: 'Booking Discount',
  cashback: 'Cashback',
  refund: 'Refund',
  manual: 'Top-up',
  referral: 'Referral Reward',
};

const categoryIcons: Record<string, typeof Gift> = {
  referral_bonus: Gift,
  referee_bonus: Gift,
  promo_code: TrendingUp,
  booking_discount: TrendingDown,
  cashback: TrendingUp,
  refund: TrendingUp,
  manual: WalletIcon,
  referral: Gift,
};

const TOPUP_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const Wallet = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet, transactions, isLoading, refetchWallet } = useWallet();
  const { toast } = useToast();
  
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop !== 0 || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, PULL_THRESHOLD * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      
      try {
        await refetchWallet();
        toast({
          title: "Refreshed",
          description: "Wallet data updated successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to refresh wallet data",
          variant: "destructive",
        });
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const loadRazorpayScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const handleTopup = async () => {
    const amount = selectedAmount || parseInt(customAmount);
    
    if (!amount || amount < 50) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum top-up amount is ₹50',
        variant: 'destructive',
      });
      return;
    }

    if (amount > 10000) {
      toast({
        title: 'Invalid Amount',
        description: 'Maximum top-up amount is ₹10,000',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    setIsProcessing(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create order
      const orderResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-wallet-topup-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            amount,
            user_id: user.id,
          }),
        }
      );

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();

      // Open Razorpay checkout
      const razorpayOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Grumming',
        description: `Wallet Top-up - ₹${amount}`,
        order_id: orderData.orderId,
        prefill: {
          email: user.email || '',
        },
        theme: {
          color: '#f97316',
        },
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-wallet-topup`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  user_id: user.id,
                  amount,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              setIsProcessing(false);
              setShowTopupModal(false);
              setSelectedAmount(null);
              setCustomAmount('');
              refetchWallet();
              toast({
                title: '🎉 Top-up Successful!',
                description: `₹${amount} has been added to your wallet.`,
              });
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (error: any) {
            setIsProcessing(false);
            toast({
              title: 'Payment Failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(razorpayOptions);
      razorpay.on('payment.failed', function (response: any) {
        setIsProcessing(false);
        toast({
          title: 'Payment Failed',
          description: response.error.description || 'Please try again.',
          variant: 'destructive',
        });
      });
      razorpay.open();
    } catch (error: any) {
      setIsProcessing(false);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-background pb-24 overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <div 
        className="flex justify-center items-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance }}
      >
        <motion.div
          animate={{ rotate: isRefreshing ? 360 : pullDistance * 2 }}
          transition={{ duration: isRefreshing ? 1 : 0, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
        >
          <RefreshCw 
            className={`w-6 h-6 ${pullDistance >= PULL_THRESHOLD ? 'text-primary' : 'text-muted-foreground'}`}
          />
        </motion.div>
      </div>

      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-lg font-semibold text-foreground">My Wallet</h1>
        </div>
      </header>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 p-[2px]">
          <div className="relative rounded-[14px] bg-gradient-to-r from-violet-500/90 via-purple-500/90 to-fuchsia-500/90 p-6">
            {/* Animated background sparkles */}
            <div className="absolute inset-0 overflow-hidden rounded-[14px]">
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/20 rounded-full blur-2xl animate-pulse" />
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-fuchsia-300/20 rounded-full blur-2xl animate-pulse delay-300" />
            </div>
            
            <div className="relative flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <WalletIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/80">Available Balance</p>
                <h2 className="text-3xl font-bold text-white">₹{wallet?.balance?.toFixed(0) || 0}</h2>
              </div>
            </div>
            
            <div className="relative flex gap-6 pt-4 border-t border-white/20">
              <div className="flex-1">
                <div className="flex items-center gap-1 text-sm text-white/80 mb-1">
                  <TrendingUp className="w-4 h-4 text-white" />
                  <span>Total Earned</span>
                </div>
                <p className="text-lg font-semibold text-white">₹{wallet?.total_earned?.toFixed(0) || 0}</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1 text-sm text-white/80 mb-1">
                  <TrendingDown className="w-4 h-4 text-white" />
                  <span>Total Spent</span>
                </div>
                <p className="text-lg font-semibold text-white">₹{wallet?.total_spent?.toFixed(0) || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mx-4 mt-4 grid grid-cols-3 gap-3"
      >
        <button
          onClick={() => setShowTopupModal(true)}
          className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Add Money</p>
          </div>
        </button>
        
        
        <button
          onClick={() => navigate('/')}
          className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <WalletIcon className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Use Credits</p>
          </div>
        </button>
      </motion.div>

      {/* Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mx-4 mt-6"
      >
        <h3 className="font-display text-base font-semibold text-foreground mb-3">Transaction History</h3>
        
        {transactions && transactions.length > 0 ? (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {transactions.map((tx, index) => {
              const IconComponent = categoryIcons[tx.category] || WalletIcon;
              const isCredit = tx.type === 'credit';
              
              return (
                <div 
                  key={tx.id}
                  className={`flex items-center gap-4 p-4 ${
                    index !== transactions.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCredit ? 'bg-green-500/10' : 'bg-destructive/10'
                  }`}>
                    {isCredit ? (
                      <ArrowDownLeft className="w-5 h-5 text-green-500" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {tx.description || categoryLabels[tx.category]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), 'MMM dd, yyyy • h:mm a')}
                    </p>
                  </div>
                  
                  <p className={`text-sm font-semibold ${
                    isCredit ? 'text-green-500' : 'text-destructive'
                  }`}>
                    {isCredit ? '+' : '-'}₹{tx.amount}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <WalletIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">No transactions yet</p>
            <p className="text-sm text-muted-foreground">
              Refer friends or complete bookings to earn credits!
            </p>
          </div>
        )}
      </motion.div>

      {/* Top-up Modal */}
      <Dialog open={showTopupModal} onOpenChange={setShowTopupModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Add Money to Wallet
            </DialogTitle>
            <DialogDescription>Select or enter an amount to add to your wallet</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            {/* Quick Amount Selection */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Select Amount</p>
              <div className="grid grid-cols-3 gap-2">
                {TOPUP_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      setSelectedAmount(amount);
                      setCustomAmount('');
                    }}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedAmount === amount
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:border-primary/50 bg-card'
                    }`}
                  >
                    <span className="text-lg font-semibold">₹{amount}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Or Enter Custom Amount</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">₹</span>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
                  placeholder="Enter amount (₹50 - ₹10,000)"
                  min={50}
                  max={10000}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <p className="text-xs text-muted-foreground">Min: ₹50 • Max: ₹10,000</p>
            </div>

            {/* Summary */}
            {(selectedAmount || customAmount) && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount to add</span>
                  <span className="text-xl font-bold text-primary">
                    ₹{selectedAmount || customAmount || 0}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowTopupModal(false);
                  setSelectedAmount(null);
                  setCustomAmount('');
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleTopup}
                disabled={isProcessing || (!selectedAmount && !customAmount)}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Money
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Wallet;
