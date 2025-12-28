import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, User, Mail, Phone, Calendar, Edit2, Save, X, Loader2, Camera, 
  Bell, ChevronRight, Gift, Settings, LogOut, CreditCard, HelpCircle, Shield, Star, Wallet, Ticket
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const { wallet } = useWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
      setProfile(data);
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
      setAvatarUrl(data.avatar_url);
    }
    setEmail(user.email || '');
    setIsLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone,
        avatar_url: avatarUrl,
      })
      .eq('user_id', user.id);

    if (profileError) {
      setIsSaving(false);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    if (email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email });
      if (emailError) {
        setIsSaving(false);
        toast({
          title: 'Email update pending',
          description: 'Check your new email for a confirmation link.',
        });
      }
    }

    setIsSaving(false);
    setProfile(prev => prev ? { ...prev, full_name: fullName, phone, avatar_url: avatarUrl } : null);
    setIsEditing(false);
    toast({
      title: 'Profile updated',
      description: 'Your profile has been saved successfully.',
    });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingAvatar(true);

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      setIsUploadingAvatar(false);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload avatar. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(newAvatarUrl);

    await supabase
      .from('profiles')
      .update({ avatar_url: newAvatarUrl })
      .eq('user_id', user.id);

    setIsUploadingAvatar(false);
    toast({
      title: 'Avatar updated',
      description: 'Your profile picture has been updated.',
    });
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
    { icon: CreditCard, label: 'Payment Methods', onClick: () => {}, badge: 'Coming Soon' },
    { icon: Shield, label: 'Privacy & Security', onClick: () => {} },
    { icon: HelpCircle, label: 'Help & Support', onClick: () => {} },
    { icon: Settings, label: 'Settings', onClick: () => {} },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
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
        className="bg-card border-b border-border p-4"
      >
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Edit Profile</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
                >
                  {isUploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs text-muted-foreground">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-muted-foreground">Email Address</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs text-muted-foreground">Phone Number</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-16 h-16">
                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-lg font-semibold text-foreground truncate">
                {fullName || 'Guest User'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                {user?.phone && <span>{user.phone}</span>}
                {user?.email && !user?.phone && <span className="truncate">{user.email}</span>}
              </div>
              <button 
                onClick={() => setIsEditing(true)}
                className="text-primary text-sm font-medium mt-1 flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </div>
        )}
      </motion.div>

      {/* Quick Actions Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4"
      >
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all active:scale-95 relative"
            >
              {'badge' in action && action.badge && (
                <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                  {action.badge}
                </span>
              )}
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <span className="text-xs font-medium text-foreground text-center leading-tight">{action.label}</span>
            </button>
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
