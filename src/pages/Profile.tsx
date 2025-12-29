import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, User, Mail, Phone, Calendar, Edit2, Save, X, Loader2, Camera, 
  Bell, ChevronRight, Gift, Settings, LogOut, CreditCard, HelpCircle, Shield, Star, Wallet, Ticket, MapPin, Heart,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useFavorites } from '@/contexts/FavoritesContext';
import BottomNav from '@/components/BottomNav';
import ImageCropDialog from '@/components/ImageCropDialog';
interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const { wallet } = useWallet();
  const { favorites } = useFavorites();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  
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
      setEmail(data.email || user.email || '');
      setAvatarUrl(data.avatar_url);
    } else {
      setEmail(user.email || '');
    }
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
        email: email,
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

    setIsSaving(false);
    setProfile(prev => prev ? { ...prev, full_name: fullName, phone, email, avatar_url: avatarUrl } : null);
    setIsEditing(false);
    toast({
      title: 'Profile updated',
      description: 'Your profile has been saved successfully.',
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    // Create a URL for the selected image and open crop dialog
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setCropDialogOpen(true);
    
    // Reset file input
    event.target.value = '';
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    if (!user) return;

    setIsUploadingAvatar(true);

    const filePath = `${user.id}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, croppedBlob, { 
        upsert: true,
        contentType: 'image/jpeg'
      });

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

    // Clean up the object URL
    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
      setSelectedImageSrc(null);
    }
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
        {isEditing ? (
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">Edit Profile</h2>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditing(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveProfile} 
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </Button>
              </div>
            </div>
            
            {/* Avatar Section */}
            <div className="flex justify-center py-2">
              <div className="relative">
                <Avatar className="w-28 h-28 ring-4 ring-primary/20 ring-offset-4 ring-offset-background shadow-xl">
                  <AvatarImage src={avatarUrl || undefined} alt={fullName} className="object-cover" />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-3 border-background hover:bg-primary/90 transition-colors"
                >
                  {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground -mt-2">Tap the camera to change photo</p>

            <ImageCropDialog
              open={cropDialogOpen}
              onOpenChange={setCropDialogOpen}
              imageSrc={selectedImageSrc || ''}
              onCropComplete={handleCroppedImage}
              aspectRatio={1}
            />

            {/* Form Fields */}
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Full Name
                </Label>
                <Input 
                  id="fullName" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="Enter your full name"
                  className="h-12 text-base bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Email Address
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="your@email.com"
                  className="h-12 text-base bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground pl-1">Used for booking confirmations & receipts</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  Phone Number
                </Label>
                <Input 
                  id="phone" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="+91 98765 43210"
                  className="h-12 text-base bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20"
                  disabled
                />
                <p className="text-xs text-muted-foreground pl-1">Phone number cannot be changed</p>
              </div>
            </div>
          </div>
        ) : (
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
            <div className="flex items-center justify-center gap-2 mb-4">
              {phone ? (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Phone Verified
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                  <AlertCircle className="w-3 h-3" />
                  Phone Not Added
                </div>
              )}
              {email ? (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Email Added
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
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
              onClick={() => setIsEditing(true)}
              className="rounded-full px-5 gap-2 border-primary/30 text-primary hover:bg-primary/5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Profile
            </Button>
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
