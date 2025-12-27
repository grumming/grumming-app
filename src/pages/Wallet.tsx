import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Wallet as WalletIcon, TrendingUp, TrendingDown, Gift, Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { format } from 'date-fns';
import BottomNav from '@/components/BottomNav';

const categoryLabels: Record<string, string> = {
  referral_bonus: 'Referral Bonus',
  referee_bonus: 'Welcome Bonus',
  promo_code: 'Promo Code',
  booking_discount: 'Booking Discount',
  cashback: 'Cashback',
  refund: 'Refund',
  manual: 'Adjustment',
};

const categoryIcons: Record<string, typeof Gift> = {
  referral_bonus: Gift,
  referee_bonus: Gift,
  promo_code: TrendingUp,
  booking_discount: TrendingDown,
  cashback: TrendingUp,
  refund: TrendingUp,
  manual: WalletIcon,
};

const Wallet = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet, transactions, isLoading } = useWallet();

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
    <div className="min-h-screen bg-background pb-24">
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
        <div className="bg-gradient-primary rounded-2xl p-6 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <WalletIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-80">Available Balance</p>
              <h2 className="text-3xl font-bold">₹{wallet?.balance?.toFixed(0) || 0}</h2>
            </div>
          </div>
          
          <div className="flex gap-6 pt-4 border-t border-white/20">
            <div className="flex-1">
              <div className="flex items-center gap-1 text-sm opacity-80 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span>Total Earned</span>
              </div>
              <p className="text-lg font-semibold">₹{wallet?.total_earned?.toFixed(0) || 0}</p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1 text-sm opacity-80 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span>Total Spent</span>
              </div>
              <p className="text-lg font-semibold">₹{wallet?.total_spent?.toFixed(0) || 0}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mx-4 mt-4 grid grid-cols-2 gap-3"
      >
        <button
          onClick={() => navigate('/referrals')}
          className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-accent" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Refer & Earn</p>
            <p className="text-xs text-muted-foreground">Get ₹100</p>
          </div>
        </button>
        
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <WalletIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Use Credits</p>
            <p className="text-xs text-muted-foreground">Book now</p>
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

      <BottomNav />
    </div>
  );
};

export default Wallet;
