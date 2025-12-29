import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, User, Mail, Phone, Save, Loader2, Camera, 
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ImageCropDialog from '@/components/ImageCropDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  email_verified: boolean | null;
}

const EditProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  
  // Email verification states
  const [showEmailVerifyDialog, setShowEmailVerifyDialog] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

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
    toast({
      title: 'Profile updated',
      description: 'Your profile has been saved successfully.',
    });
    navigate('/profile');
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

    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setCropDialogOpen(true);
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

    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
      setSelectedImageSrc(null);
    }
  };

  const handleSendEmailOtp = async () => {
    if (!user || !email) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSendingOtp(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-email-otp', {
        body: { user_id: user.id, email }
      });
      
      if (error) throw error;
      
      setOtpSent(true);
      toast({
        title: 'OTP Sent',
        description: `Verification code sent to ${email}`,
      });
    } catch (error: any) {
      console.error('Failed to send OTP:', error);
      toast({
        title: 'Failed to send OTP',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!user || !email || emailOtp.length !== 6) return;
    
    setIsVerifyingOtp(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-otp', {
        body: { user_id: user.id, email, otp: emailOtp }
      });
      
      if (error) throw error;
      
      setEmailVerified(true);
      setShowEmailVerifyDialog(false);
      setEmailOtp('');
      setOtpSent(false);
      
      toast({
        title: 'Email Verified',
        description: 'Your email has been verified successfully!',
      });
      
      fetchProfile();
    } catch (error: any) {
      console.error('Failed to verify OTP:', error);
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid or expired OTP.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const openEmailVerifyDialog = () => {
    setEmailOtp('');
    setOtpSent(false);
    setShowEmailVerifyDialog(true);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-md border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/profile')} 
              className="p-2 -ml-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-display text-lg font-semibold text-foreground">Edit Profile</h1>
          </div>
          <Button 
            onClick={handleSaveProfile} 
            disabled={isSaving}
            className="gap-2.5 rounded-full px-5 py-2 h-auto shadow-md hover:shadow-lg transition-all"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Avatar Section Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-sm"
        >
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              {/* Decorative ring */}
              <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20 blur-sm" />
              <Avatar className="relative w-28 h-28 ring-4 ring-primary/20 ring-offset-4 ring-offset-card shadow-xl">
                <AvatarImage src={avatarUrl || undefined} alt={fullName} className="object-cover" />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-3 border-card hover:bg-primary/90 hover:scale-110 transition-all"
              >
                {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>
            <p className="text-sm text-muted-foreground">Tap the camera icon to change your photo</p>
          </div>
        </motion.div>

        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageSrc={selectedImageSrc || ''}
          onCropComplete={handleCroppedImage}
          aspectRatio={1}
        />

        {/* Personal Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground">Personal Information</h3>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium text-muted-foreground">
              Full Name
            </Label>
            <Input 
              id="fullName" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              placeholder="Enter your full name"
              className="h-12 text-base bg-muted/30 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </motion.div>

        {/* Contact Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground">Contact Information</h3>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                Email Address
              </Label>
              {emailVerified && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (e.target.value !== profile?.email) {
                    setEmailVerified(false);
                  }
                }} 
                placeholder="your@email.com"
                className="h-12 text-base bg-muted/30 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 flex-1"
              />
              {email && !emailVerified && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={openEmailVerifyDialog}
                  className="h-12 px-4 rounded-xl text-primary border-primary/30 hover:bg-primary/5 font-medium"
                >
                  Verify
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Used for booking confirmations & receipts</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Phone Number
              <span className="text-xs text-muted-foreground/60 font-normal">(cannot be changed)</span>
            </Label>
            <div className="relative">
              <Input 
                id="phone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="+91 98765 43210"
                className="h-12 text-base bg-muted/50 border-border/30 rounded-xl text-muted-foreground cursor-not-allowed"
                disabled
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Phone className="w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tips Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-primary/5 rounded-2xl border border-primary/10 p-4"
        >
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground mb-1">Keep your profile updated</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A complete profile helps us personalize your experience and ensures you receive important booking updates.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Email Verification Dialog */}
      <Dialog open={showEmailVerifyDialog} onOpenChange={setShowEmailVerifyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Email Address</DialogTitle>
            <DialogDescription>
              {otpSent 
                ? `Enter the 6-digit code sent to ${email}` 
                : `We'll send a verification code to ${email}`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!otpSent ? (
              <Button 
                onClick={handleSendEmailOtp} 
                disabled={isSendingOtp}
                className="w-full"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
            ) : (
              <>
                <div className="flex justify-center">
                  <InputOTP 
                    maxLength={6} 
                    value={emailOtp} 
                    onChange={(value) => setEmailOtp(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                
                <Button 
                  onClick={handleVerifyEmailOtp} 
                  disabled={isVerifyingOtp || emailOtp.length !== 6}
                  className="w-full"
                >
                  {isVerifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Email'
                  )}
                </Button>
                
                <button
                  onClick={handleSendEmailOtp}
                  disabled={isSendingOtp}
                  className="w-full text-center text-sm text-primary hover:underline disabled:opacity-50"
                >
                  {isSendingOtp ? 'Sending...' : 'Resend Code'}
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditProfile;
