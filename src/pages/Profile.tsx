import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Mail, Phone, Calendar, Edit2, Loader2, 
  ChevronRight, Gift, Settings, LogOut, CreditCard, Heart, Wallet, Ticket,
  CheckCircle2, AlertCircle, Shield, Store
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useSalonOwner } from '@/hooks/useSalonOwner';
import { supabase } from '@/integrations/supabase/client';
import { useFavorites } from '@/contexts/FavoritesContext';
import BottomNav from '@/components/BottomNav';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  email_verified: boolean | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { isSalonOwner } = useSalonOwner();
  const { wallet } = useWallet();
  const { favorites } = useFavorites();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
    } else if (data) {
      setProfile(data as Profile);
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
      setEmail(data.email || user.email || '');
      setAvatarUrl(data.avatar_url);
      setEmailVerified((data as Profile).email_verified || false);
    } else {
      setEmail(user.email || '');
    }
    setIsLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const quickActions = [
    { icon: Wallet, label: 'Wallet', onClick: () => navigate('/wallet'), color: 'text-green-500', badge: `₹${wallet?.balance?.toFixed(0) || 0}` },
    { icon: Ticket, label: 'My Vouchers', onClick: () => navigate('/my-vouchers'), color: 'text-purple-500' },
    { icon: Calendar, label: 'My Bookings', onClick: () => navigate('/my-bookings'), color: 'text-primary' },
    { icon: Gift, label: 'Refer & Earn', onClick: () => navigate('/referrals'), color: 'text-accent' },
  ];

  const menuItems = [
    { icon: Heart, label: 'Favorites', onClick: () => navigate('/favorites'), badge: favorites.length > 0 ? `${favorites.length}` : undefined },
    { icon: CreditCard, label: 'Payment Methods', onClick: () => navigate('/payment-methods') },
    { icon: Settings, label: 'Settings', onClick: () => navigate('/settings') },
    ...(isSalonOwner ? [{ icon: Store, label: 'Salon Dashboard', onClick: () => navigate('/salon-dashboard') }] : []),
    ...(isAdmin ? [{ icon: Shield, label: 'Admin Dashboard', onClick: () => navigate('/admin') }] : []),
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-md border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 -ml-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-lg font-semibold text-foreground">My Account</h1>
        </div>
      </header>

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-b from-primary/5 to-transparent"
      >
        <div className="p-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <Avatar className="w-24 h-24 ring-4 ring-primary/20 ring-offset-2 ring-offset-background shadow-xl">
              <AvatarImage src={avatarUrl || undefined} alt={fullName} className="object-cover" />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
            </div>
          </div>
          
          <h2 className="font-display text-xl font-bold text-foreground mb-1">
            {fullName || 'Guest User'}
          </h2>
          
          <div className="flex flex-col gap-1 text-sm text-muted-foreground mb-3">
            {email && (
              <span className="flex items-center justify-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {email}
              </span>
            )}
            {phone && (
              <span className="flex items-center justify-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {phone}
              </span>
            )}
          </div>

          {/* Verification Badges */}
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            {phone ? (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Phone Verified
              </div>
            ) : (
              <button 
                onClick={() => navigate('/edit-profile')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <AlertCircle className="w-3 h-3" />
                Phone Not Added
              </button>
            )}
            {email && emailVerified ? (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Email Verified
              </div>
            ) : email ? (
              <button 
                onClick={() => navigate('/edit-profile')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                <AlertCircle className="w-3 h-3" />
                Verify Email
              </button>
            ) : (
              <button 
                onClick={() => navigate('/edit-profile')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                <AlertCircle className="w-3 h-3" />
                Add Email
              </button>
            )}
          </div>
          
          <Button 
            variant="outline"
            size="sm"
            onClick={() => navigate('/edit-profile')}
            className="rounded-full px-5 gap-2 border-primary/30 text-primary hover:bg-primary/5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Profile
          </Button>
        </div>
      </motion.div>

      {/* Quick Actions Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 py-2"
      >
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.label}
              onClick={action.onClick}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-2.5 py-4 px-2 rounded-2xl bg-card hover:bg-card/80 transition-all relative group"
            >
              <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                action.label === 'Wallet' ? 'bg-green-100' :
                action.label === 'My Vouchers' ? 'bg-purple-100' :
                action.label === 'My Bookings' ? 'bg-primary/10' :
                'bg-accent/10'
              }`}>
                <action.icon className={`w-6 h-6 ${action.color}`} />
                {'badge' in action && action.badge && (
                  <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full shadow-sm">
                    {action.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-foreground text-center leading-tight">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Menu Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mx-4 bg-card rounded-xl border border-border overflow-hidden"
      >
        {menuItems.map((item, index) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors ${
              index !== menuItems.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <item.icon className="w-4.5 h-4.5 text-muted-foreground" />
            </div>
            <span className="flex-1 text-left text-sm font-medium text-foreground">{item.label}</span>
            {item.badge && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{item.badge}</span>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </motion.div>

      {/* Logout Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mx-4 mt-4"
      >
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:bg-destructive/5 hover:border-destructive/30 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center">
            <LogOut className="w-4.5 h-4.5 text-destructive" />
          </div>
          <span className="flex-1 text-left text-sm font-medium text-destructive">Log Out</span>
        </button>
      </motion.div>

      {/* App Version */}
      <div className="text-center mt-6 text-xs text-muted-foreground">
        Version 1.0.0
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
