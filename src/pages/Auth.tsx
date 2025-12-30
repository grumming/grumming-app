import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowLeft, ArrowRight, Loader2, Gift, ChevronDown, ChevronRight, ClipboardPaste, User, Mail, Smartphone, Check, X, MoreVertical, Store, Calendar, TrendingUp, MessageSquare, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useReferral } from '@/hooks/useReferral';
import { useSmsRetriever } from '@/hooks/useSmsRetriever';
import { supabase } from '@/integrations/supabase/client';
import { ReferralSuccessAnimation } from '@/components/ReferralSuccessAnimation';
import { z } from 'zod';
import confetti from 'canvas-confetti';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Whitelisted test phone numbers (for development)
const TEST_PHONE_NUMBERS = [
  '9262582899',
  '7004414512',
  '9534310739',
  '9135812785',
];
const TEST_OTP = '111456';

const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits').regex(/^[0-9]+$/, 'Please enter a valid phone number');
const otpSchema = z.string().length(6, 'OTP must be 6 digits');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters');
const emailSchema = z.string().email('Please enter a valid email').max(255, 'Email must be less than 255 characters').optional().or(z.literal(''));

type AuthStep = 'phone' | 'otp' | 'profile';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const { applyReferralCode } = useReferral();
  
  const referralCodeFromUrl = searchParams.get('ref');
  
  const [step, setStep] = useState<AuthStep>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSalonOwnerMode, setIsSalonOwnerMode] = useState(false);
  const [showReferralSuccess, setShowReferralSuccess] = useState(false);
  const [showReferralInput, setShowReferralInput] = useState(!!referralCodeFromUrl);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showExistingAccountModal, setShowExistingAccountModal] = useState(false);
  const [showNoAccountModal, setShowNoAccountModal] = useState(false);
  const [accountExistsInline, setAccountExistsInline] = useState(false);
  const [pendingRedirectUrl, setPendingRedirectUrl] = useState<string | null>(null);
  
  // Form fields
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [referralCode, setReferralCode] = useState(referralCodeFromUrl || '');
  const [referralValidation, setReferralValidation] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [pendingVerificationUrl, setPendingVerificationUrl] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otpComplete, setOtpComplete] = useState(false);
  
  // Resend OTP cooldown (30 seconds)
  const [resendCooldown, setResendCooldown] = useState(0);

  // Ref to store handleVerifyOTP function for SMS auto-read callback
  const verifyOtpRef = useRef<(otp: string) => void>(() => {});

  // SMS Auto-read callback
  const handleOtpAutoRead = useCallback((otp: string) => {
    if (step === 'otp' && otp.length === 6) {
      // Auto-fill the OTP digits
      const digits = otp.split('');
      setOtpDigits(digits);
      setOtpComplete(true);
      
      toast({
        title: 'OTP Auto-filled',
        description: 'OTP detected from SMS',
      });
      
      // Auto-verify after a short delay using the ref
      setTimeout(() => {
        verifyOtpRef.current(otp);
      }, 500);
    }
  }, [step, toast]);

  // SMS Retriever hook for Android OTP auto-read
  const { startListening: startSmsListener, stopListening: stopSmsListener, isAndroid } = useSmsRetriever(handleOtpAutoRead);

  // Haptic feedback helper
  const triggerHaptic = (type: 'light' | 'success' | 'error') => {
    if ('vibrate' in navigator) {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'success':
          navigator.vibrate([50, 30, 50]);
          break;
        case 'error':
          navigator.vibrate([100, 50, 100]);
          break;
      }
    }
  };

  useEffect(() => {
    if (!loading && user) {
      // Check for pending salon owner registration
      const pendingSalonOwner = localStorage.getItem('pendingSalonOwnerRegistration');
      if (pendingSalonOwner) {
        localStorage.removeItem('pendingSalonOwnerRegistration');
        navigate('/salon-registration');
        return;
      }
      
      // Check for referral code from state or localStorage
      const storedReferralCode = localStorage.getItem('pendingReferralCode');
      const codeToApply = referralCode || storedReferralCode;
      
      if (codeToApply) {
        // Clear the stored referral code
        localStorage.removeItem('pendingReferralCode');
        
        applyReferralCode(codeToApply).then(() => {
          // Show the referral success animation
          setShowReferralSuccess(true);
        }).catch((error) => {
          console.log('Referral apply failed:', error.message);
          // Referral failed, just navigate
          navigate('/');
        });
      } else {
        navigate('/');
      }
    }
  }, [user, loading, navigate, referralCode, applyReferralCode]);

  // Resend cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Clear inline account-exists message when switching modes or changing phone
  useEffect(() => {
    setAccountExistsInline(false);
  }, [isSignUp, phone]);

  // Validate referral code in real-time
  useEffect(() => {
    if (!referralCode || referralCode.length < 4) {
      setReferralValidation('idle');
      return;
    }

    const validateReferralCode = async () => {
      setReferralValidation('checking');
      try {
        const { data, error } = await supabase
          .from('referral_codes')
          .select('user_id')
          .eq('code', referralCode.toUpperCase())
          .maybeSingle();

        if (error || !data) {
          setReferralValidation('invalid');
          triggerHaptic('error');
        } else {
          setReferralValidation('valid');
          triggerHaptic('success');
          // Fire confetti for valid referral code
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#22c55e', '#4ade80', '#86efac', '#7c3aed', '#a78bfa']
          });
        }
      } catch {
        setReferralValidation('invalid');
        triggerHaptic('error');
      }
    };

    const debounceTimer = setTimeout(validateReferralCode, 500);
    return () => clearTimeout(debounceTimer);
  }, [referralCode]);

  const handleReferralAnimationComplete = () => {
    setShowReferralSuccess(false);
    navigate('/');
  };

  const validateField = (field: string, value: string) => {
    try {
      switch (field) {
        case 'phone':
          phoneSchema.parse(value);
          break;
        case 'otp':
          otpSchema.parse(value);
          break;
        case 'fullName':
          nameSchema.parse(value);
          break;
        case 'email':
          if (value) emailSchema.parse(value);
          break;
      }
      setErrors(prev => ({ ...prev, [field]: '' }));
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [field]: err.errors[0].message }));
      }
      return false;
    }
  };

  const sendOtp = async (mode: boolean) => {
    if (!validateField('phone', phone)) return;

    const formattedPhone = `+91${phone}`;

    setIsLoading(true);

    try {
      // Send OTP via SMS
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ phone: formattedPhone, isSignUp: mode }),
        }
      );

      const data = await response.json();
      const errorCode = data?.code;

      // Handle expected flows (regardless of status code)
      if (mode && errorCode === 'ACCOUNT_EXISTS') {
        setAccountExistsInline(true);
        return;
      }

      if (!mode && errorCode === 'NO_ACCOUNT') {
        setIsSignUp(true);
        return;
      }

      // Handle errors
      if (!response.ok || !data?.success) {
        toast({
          title: 'Error',
          description: data?.error || data?.message || 'Failed to send OTP',
          variant: 'destructive',
        });
        return;
      }

      if (mode && data?.code === 'ACCOUNT_EXISTS') {
        setAccountExistsInline(true);
        return;
      }

      if (!data?.success) {
        toast({
          title: 'Error',
          description: data?.error || 'Failed to send OTP',
          variant: 'destructive',
        });
        return;
      }

      setStep('otp');
      setResendCooldown(30);
      toast({
        title: 'OTP Sent!',
        description: 'Please check your phone for the verification code.',
      });

      // Start SMS auto-read listener on Android
      if (isAndroid) {
        startSmsListener();
      }

    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Failed to send OTP',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneOTP = async () => {
    await sendOtp(isSignUp);
  };

  const handleVerifyOTP = useCallback(async (otp: string) => {
    if (!validateField('otp', otp)) return;
    
    const formattedPhone = `+91${phone}`;
    
    setIsLoading(true);
    
    // Stop SMS listener when verifying
    stopSmsListener();
    
    try {
      // Verify OTP via edge function
      const { data, error } = await supabase.functions.invoke('verify-sms-otp', {
        body: { 
          phone: formattedPhone, 
          otp,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to verify OTP');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Invalid OTP');
      }

      triggerHaptic('success');
      
      // Fire confetti celebration only for new users
      if (data.isNewUser) {
        const fireConfetti = () => {
          // Center burst
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#7c3aed', '#a78bfa', '#c4b5fd', '#22c55e', '#4ade80']
          });
          
          // Side bursts
          setTimeout(() => {
            confetti({
              particleCount: 50,
              angle: 60,
              spread: 55,
              origin: { x: 0, y: 0.6 },
              colors: ['#7c3aed', '#a78bfa', '#22c55e']
            });
            confetti({
              particleCount: 50,
              angle: 120,
              spread: 55,
              origin: { x: 1, y: 0.6 },
              colors: ['#7c3aed', '#a78bfa', '#22c55e']
            });
          }, 150);
        };
        fireConfetti();
        
        // For new users, show profile completion step
        toast({
          title: 'Account Created!',
          description: 'Please complete your profile.',
        });
        
        // Store the verification URL for later use after profile completion
        if (data.verificationUrl) {
          setPendingVerificationUrl(data.verificationUrl);
        }
        setStep('profile');
      } else {
        // Existing user - complete login immediately
        // If salon owner mode, check if user has an approved salon
        if (isSalonOwnerMode && data.userId) {
          const { data: ownerData, error: ownerError } = await supabase
            .from('salon_owners')
            .select(`
              salon_id,
              salons!inner (
                id,
                is_active
              )
            `)
            .eq('user_id', data.userId);
          
          if (ownerError || !ownerData || ownerData.length === 0) {
            triggerHaptic('error');
            toast({
              title: 'No Salon Found',
              description: 'You don\'t have any registered salon. Please list your salon first.',
              variant: 'destructive',
            });
            setIsLoading(false);
            navigate('/salon-registration');
            return;
          }
          
          // Check if at least one salon is approved (is_active = true)
          const hasApprovedSalon = ownerData.some((o: any) => o.salons?.is_active === true);
          
          if (!hasApprovedSalon) {
            triggerHaptic('error');
            toast({
              title: 'Salon Pending Approval',
              description: 'Your salon is pending admin approval. You\'ll be notified once approved.',
              variant: 'destructive',
            });
            setIsLoading(false);
            return;
          }
        }
        
        if (data.verificationUrl) {
          window.location.href = data.verificationUrl;
          return;
        }
        navigate('/');
      }
    } catch (error: any) {
      triggerHaptic('error');
      setOtpComplete(false);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
      toast({
        title: 'Verification Failed',
        description: error.message || 'The code you entered is incorrect.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [phone, navigate, toast, stopSmsListener, isSalonOwnerMode]);

  // Keep verifyOtpRef updated with the latest handleVerifyOTP
  useEffect(() => {
    verifyOtpRef.current = handleVerifyOTP;
  }, [handleVerifyOTP]);

  const handleProfileComplete = async () => {
    if (!validateField('fullName', fullName)) return;
    if (email && !validateField('email', email)) return;
    
    setIsLoading(true);
    
    try {
      // We'll update the profile after authentication is complete
      // Store the profile data and referral code in localStorage temporarily
      localStorage.setItem('pendingProfile', JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim() || null,
      }));
      
      // Store referral code for after redirect (so referrer stats update even after page reload)
      if (referralCode) {
        localStorage.setItem('pendingReferralCode', referralCode.toUpperCase());
      }
      
      // Store salon owner mode flag for redirect after auth
      if (isSalonOwnerMode) {
        localStorage.setItem('pendingSalonOwnerRegistration', 'true');
      }
      
      toast({
        title: 'Profile saved!',
        description: isSalonOwnerMode ? 'Now let\'s register your salon!' : 'Welcome to Grumming!',
      });
      
      // Now redirect to complete authentication
      if (pendingVerificationUrl) {
        window.location.href = pendingVerificationUrl;
      } else {
        // If salon owner mode, redirect to salon registration
        navigate(isSalonOwnerMode ? '/salon-registration' : '/');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtpDigits(['', '', '', '', '', '']);
      stopSmsListener(); // Stop SMS listener when going back
    } else if (step === 'profile') {
      // Can't go back from profile - must complete it
      return;
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Referral Success Animation */}
      <ReferralSuccessAnimation 
        isVisible={showReferralSuccess} 
        onComplete={handleReferralAnimationComplete}
        rewardAmount={100}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"
            animate={{ 
              y: [0, -20, 0],
              x: [0, 10, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl"
            animate={{ 
              y: [0, 20, 0],
              x: [0, -10, 0],
              scale: [1, 1.08, 1]
            }}
            transition={{ 
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ 
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          />
        </div>
      {/* Header */}
      <header className="relative z-10 p-4 flex items-center justify-between">
        <button onClick={goBack} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        
        {/* 3-dot menu - Only in Salon Owner mode */}
        {isSalonOwnerMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-muted/80 transition-colors">
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-1.5">
              <DropdownMenuItem 
                onClick={() => navigate('/salon-registration')}
                className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-primary/5 focus:bg-primary/5 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                  <Store className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-foreground">List your Salon</span>
                  <span className="text-[11px] text-muted-foreground">Register & grow your business</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <div className="flex-1 flex flex-col">
        {/* Form Section */}
        <div className="flex-1 flex flex-col px-6 py-8 lg:justify-center">
        <AnimatePresence mode="wait">
          {/* Phone Number Step */}
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-md mx-auto"
            >
              {/* Salon Owner Mode - Professional Header */}
              <AnimatePresence mode="wait">
                {isSalonOwnerMode ? (
                  <motion.div
                    key="salon-owner-header"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mb-6"
                  >
                    <motion.button
                      type="button"
                      onClick={() => setIsSalonOwnerMode(false)}
                      className="group w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-[1px] shadow-xl shadow-primary/20"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="relative flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-primary via-primary/95 to-primary/85 px-6 py-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-foreground/15 backdrop-blur-sm">
                          <Store className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-primary-foreground font-bold text-base tracking-tight">Salon Owner Mode</span>
                          <span className="text-primary-foreground/70 text-xs">Partner Dashboard Access</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-primary-foreground/60 ml-auto group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="customer-header"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mb-6"
                  >
                    <motion.button
                      type="button"
                      onClick={() => setIsSalonOwnerMode(true)}
                      className="group w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/80 via-muted/50 to-muted/30 border border-border/60 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center justify-center gap-3 px-5 py-3.5">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                          <Store className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-foreground/90 font-semibold text-sm">Are you a Salon Owner?</span>
                          <span className="text-muted-foreground text-[11px]">Register & grow your business</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Login / Sign Up Toggle */}
              <div className="mb-8">
                {!isSalonOwnerMode && (
                  <div className="flex bg-muted/60 rounded-full p-1 mb-4 relative border border-border/40">
                    <motion.div
                      className="absolute top-1 bottom-1 rounded-full bg-background shadow-md"
                      initial={false}
                      animate={{
                        left: isSignUp ? 'calc(50% + 2px)' : '4px',
                        right: isSignUp ? '4px' : 'calc(50% + 2px)',
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                    <motion.button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      whileTap={{ scale: 0.98 }}
                      className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-full transition-colors ${
                        !isSignUp ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      Login
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      whileTap={{ scale: 0.98 }}
                      className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-full transition-colors ${
                        isSignUp ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      Sign Up
                    </motion.button>
                  </div>
                )}
                {!isSalonOwnerMode && (
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={`${isSignUp}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm text-muted-foreground text-center"
                    >
                      {isSignUp
                        ? 'Create a new account to book appointments and earn rewards.'
                        : 'Welcome back! Enter your phone number to continue.'}
                    </motion.p>
                  </AnimatePresence>
                )}
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex gap-3">
                    <div className="w-20 h-14 rounded-lg border border-input bg-muted/30 flex items-center justify-center text-sm font-medium">
                      🇮🇳 +91
                    </div>
                    <div className="relative flex-1 group">
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        onBlur={() => phone && validateField('phone', phone)}
                        className={`h-14 text-lg tracking-wide font-medium pl-4 pt-5 pb-2 transition-all duration-200 bg-muted/30 peer focus:bg-background ${errors.phone ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                        placeholder=""
                      />
                      <label 
                        htmlFor="phone"
                        className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                          phone 
                            ? 'top-2 text-[10px] font-semibold uppercase tracking-wider' 
                            : 'top-1/2 -translate-y-1/2 text-sm'
                        } ${
                          errors.phone 
                            ? 'text-destructive' 
                            : 'text-muted-foreground peer-focus:text-primary peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-wider'
                        }`}
                      >
                        Mobile Number
                      </label>
                    </div>
                  </div>
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  
                  {/* Inline account-exists message */}
                  <AnimatePresence>
                    {accountExistsInline && isSignUp && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
                          <Smartphone className="w-4 h-4 flex-shrink-0" />
                          <p className="text-sm">
                            This number is already registered.{' '}
                            <button
                              type="button"
                              onClick={() => {
                                setIsSignUp(false);
                                setAccountExistsInline(false);
                              }}
                              className="font-semibold underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
                            >
                              Switch to Login
                            </button>
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Continue Button - Positioned right after phone input for salon owners */}
                {isSalonOwnerMode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Button
                      className="w-full h-14 text-base font-semibold bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                      onClick={handlePhoneOTP}
                      disabled={isLoading || phone.length < 10}
                    >
                      {isLoading && (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      )}
                      Continue
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                )}

                {/* Referral Code Field - Collapsible - Only show during signup for customers (not salon owners) */}
                {isSignUp && !isSalonOwnerMode && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowReferralInput(!showReferralInput)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border border-dashed transition-colors ${
                      referralValidation === 'valid' 
                        ? 'border-green-500/50 bg-green-500/10 hover:bg-green-500/15' 
                        : referralValidation === 'invalid'
                        ? 'border-destructive/50 bg-destructive/10 hover:bg-destructive/15'
                        : 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Gift className={`w-4 h-4 ${
                        referralValidation === 'valid' ? 'text-green-500' : 
                        referralValidation === 'invalid' ? 'text-destructive' : 'text-primary'
                      }`} />
                      <span className={`text-sm font-medium ${
                        referralValidation === 'valid' ? 'text-green-600 dark:text-green-400' : 
                        referralValidation === 'invalid' ? 'text-destructive' : 'text-foreground'
                      }`}>
                        {referralCode ? `Referral: ${referralCode}` : 'Have a referral code?'}
                      </span>
                      {referralValidation === 'valid' && <Check className="w-4 h-4 text-green-500" />}
                      {referralValidation === 'invalid' && <X className="w-4 h-4 text-destructive" />}
                    </div>
                    <ChevronDown 
                      className={`w-4 h-4 transition-transform duration-200 ${
                        showReferralInput ? 'rotate-180' : ''
                      } ${
                        referralValidation === 'valid' ? 'text-green-500' : 
                        referralValidation === 'invalid' ? 'text-destructive' : 'text-primary'
                      }`} 
                    />
                  </button>
                  
                  <AnimatePresence>
                    {showReferralInput && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2 space-y-3">
                          <div className="relative group">
                            <Input
                              id="referral"
                              type="text"
                              value={referralCode}
                              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                              className={`h-14 uppercase tracking-widest text-base font-medium pr-24 pl-4 pt-5 pb-2 transition-all duration-200 bg-muted/30 peer ${
                                referralValidation === 'valid' 
                                  ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20 focus-visible:ring-green-500/30' 
                                  : referralValidation === 'invalid'
                                  ? 'border-destructive bg-destructive/5 focus-visible:ring-destructive/30'
                                  : 'focus:bg-background'
                              }`}
                              maxLength={8}
                              autoFocus
                              placeholder=""
                            />
                            <label 
                              htmlFor="referral"
                              className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                                referralCode 
                                  ? 'top-2 text-[10px] font-semibold uppercase tracking-wider' 
                                  : 'top-1/2 -translate-y-1/2 text-sm'
                              } ${
                                referralValidation === 'valid' 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : referralValidation === 'invalid'
                                  ? 'text-destructive'
                                  : 'text-muted-foreground peer-focus:text-primary peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-wider'
                              }`}
                            >
                              Referral Code
                            </label>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                              {referralValidation === 'checking' && (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span className="text-xs">Checking...</span>
                                </div>
                              )}
                              {referralValidation === 'valid' && (
                                <>
                                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                    <span className="text-xs font-medium text-green-600 dark:text-green-400">Valid</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReferralCode('');
                                      triggerHaptic('light');
                                    }}
                                    className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    title="Clear code"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {referralValidation === 'invalid' && (
                                <>
                                  <div className="flex items-center gap-1 px-2 py-1 bg-destructive/10 rounded-full">
                                    <X className="w-3.5 h-3.5 text-destructive" />
                                    <span className="text-xs font-medium text-destructive">Invalid</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReferralCode('');
                                      triggerHaptic('light');
                                    }}
                                    className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    title="Clear code"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {referralValidation === 'idle' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const text = await navigator.clipboard.readText();
                                      const cleanCode = text.trim().toUpperCase().slice(0, 8);
                                      if (cleanCode) {
                                        setReferralCode(cleanCode);
                                        triggerHaptic('light');
                                        toast({
                                          title: 'Code pasted!',
                                          description: `Referral code "${cleanCode}" applied.`,
                                        });
                                      }
                                    } catch (err) {
                                      toast({
                                        title: 'Unable to paste',
                                        description: 'Please paste manually or allow clipboard access.',
                                        variant: 'destructive',
                                      });
                                    }
                                  }}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-xs font-medium"
                                  title="Paste from clipboard"
                                >
                                  <ClipboardPaste className="w-3.5 h-3.5" />
                                  Paste
                                </button>
                              )}
                            </div>
                          </div>
                          <AnimatePresence mode="wait">
                            {referralValidation === 'valid' && (
                              <motion.p 
                                key="valid"
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1"
                              >
                                🎁 You'll get ₹100 off your first booking!
                              </motion.p>
                            )}
                            {referralValidation === 'invalid' && (
                              <motion.p 
                                key="invalid"
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="text-xs text-destructive flex items-center gap-1"
                              >
                                ❌ Invalid referral code. Please check and try again.
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                )}

                {/* Salon Owner Benefits Showcase - Only in Salon Owner Mode */}
                {isSalonOwnerMode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4 pt-2"
                  >
                    {/* Section Header */}
                    <div className="text-center space-y-1">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary/30" />
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                          Partner Benefits
                        </p>
                        <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/30" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Join 1000+ salon owners growing with Grumming
                      </p>
                    </div>

                    {/* Benefits Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: Calendar, title: 'Smart Scheduling', desc: 'Automated booking & reminders', color: 'from-blue-500/20 to-blue-600/10' },
                        { icon: TrendingUp, title: 'Revenue Growth', desc: 'Up to 40% more customers', color: 'from-emerald-500/20 to-emerald-600/10' },
                        { icon: MessageSquare, title: 'Direct Chat', desc: 'Real-time client messaging', color: 'from-violet-500/20 to-violet-600/10' },
                        { icon: Star, title: '5-Star Reviews', desc: 'Build trust & visibility', color: 'from-amber-500/20 to-amber-600/10' },
                      ].map((benefit, index) => (
                        <motion.div
                          key={benefit.title}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + index * 0.08, type: 'spring', stiffness: 300 }}
                          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-background to-muted/50 border border-border/50 p-3.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                        >
                          {/* Gradient Background */}
                          <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                          
                          <div className="relative flex flex-col gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                              <benefit.icon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{benefit.title}</p>
                              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{benefit.desc}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Trust Badge */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="flex items-center justify-center gap-2 py-2"
                    >
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-background flex items-center justify-center">
                            <Store className="w-3 h-3 text-primary" />
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        <span className="font-semibold text-foreground">Free</span> to register • No hidden fees
                      </p>
                    </motion.div>
                  </motion.div>
                )}

                {!isSalonOwnerMode && (
                  <Button
                    className="w-full h-14 text-base font-semibold"
                    onClick={handlePhoneOTP}
                    disabled={isLoading || phone.length < 10}
                  >
                    {isLoading && (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    )}
                    Continue
                  </Button>
                )}

                <p className="text-xs text-center text-muted-foreground leading-relaxed">
                  By clicking on Continue, I accept the{' '}
                  <button 
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-primary font-medium hover:underline"
                  >
                    Terms & Conditions
                  </button>
                  {' '}and{' '}
                  <button 
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-primary font-medium hover:underline"
                  >
                    Privacy Policy
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {/* OTP Verification Step */}
          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-md mx-auto"
            >
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Verify with OTP
              </h1>
              <p className="text-muted-foreground mb-4">
                Sent to +91 {phone}
              </p>
              
              {/* Test OTP hint for whitelisted numbers */}
              {TEST_PHONE_NUMBERS.includes(phone) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                      🧪 Test Mode
                    </span>
                  </div>
                  <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
                    Use OTP: <span className="font-mono font-bold tracking-wider">{TEST_OTP}</span>
                  </p>
                </motion.div>
              )}
              
              <div className="space-y-6">
                <div className="space-y-4">
                  {/* Individual OTP digit boxes */}
                  <div className="flex justify-center gap-3 sm:gap-4">
                    {otpDigits.map((digit, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0, 
                          scale: 1,
                        }}
                        transition={{ 
                          delay: index * 0.08,
                          type: "spring",
                          stiffness: 300,
                          damping: 20
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <motion.input
                          ref={(el) => (otpInputRefs.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          autoFocus={index === 0}
                          disabled={isLoading}
                          animate={
                            otpComplete 
                              ? { 
                                  scale: [1, 1.1, 1],
                                  borderColor: "rgb(34 197 94)"
                                }
                              : digit 
                                ? { scale: [0.9, 1.05, 1] }
                                : {}
                          }
                          transition={{ duration: 0.2 }}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value.length <= 1) {
                              const newDigits = [...otpDigits];
                              newDigits[index] = value;
                              setOtpDigits(newDigits);
                              
                              if (value) {
                                triggerHaptic('light');
                              }
                              
                              if (value && index < 5) {
                                otpInputRefs.current[index + 1]?.focus();
                              }
                              
                              const fullOtp = newDigits.join('');
                              if (fullOtp.length === 6) {
                                setOtpComplete(true);
                                triggerHaptic('success');
                                setTimeout(() => handleVerifyOTP(fullOtp), 300);
                              } else {
                                setOtpComplete(false);
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !digit && index > 0) {
                              otpInputRefs.current[index - 1]?.focus();
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                            if (pastedData) {
                              const newDigits = [...otpDigits];
                              pastedData.split('').forEach((char, i) => {
                                if (i < 6) newDigits[i] = char;
                              });
                              setOtpDigits(newDigits);
                              triggerHaptic('light');
                              
                              const focusIndex = Math.min(pastedData.length, 5);
                              otpInputRefs.current[focusIndex]?.focus();
                              
                              if (pastedData.length === 6) {
                                setOtpComplete(true);
                                triggerHaptic('success');
                                setTimeout(() => handleVerifyOTP(pastedData), 300);
                              }
                            }
                          }}
                          className={`
                            w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-bold 
                            border-2 rounded-2xl transition-all duration-300 ease-out
                            bg-background/80 backdrop-blur-sm text-foreground
                            shadow-sm hover:shadow-md
                            ${digit ? 'border-primary bg-primary/5 shadow-primary/20' : 'border-input hover:border-primary/50'}
                            ${otpComplete ? 'border-green-500 bg-green-500/10 shadow-green-500/30 shadow-lg' : ''}
                            focus:border-primary focus:ring-4 focus:ring-primary/20 focus:outline-none focus:shadow-lg focus:shadow-primary/20
                            disabled:opacity-50 disabled:cursor-not-allowed
                          `}
                        />
                      </motion.div>
                    ))}
                  </div>
                  
                  {errors.otp && (
                    <p className="text-xs text-destructive text-center">{errors.otp}</p>
                  )}
                </div>

                {isLoading && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Verifying...</span>
                  </div>
                )}

                <Button
                  className="w-full h-14 text-base font-semibold"
                  onClick={() => handleVerifyOTP(otpDigits.join(''))}
                  disabled={isLoading || otpDigits.join('').length < 6}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : null}
                  Verify
                </Button>

                <div className="text-center">
                  <button
                    onClick={() => {
                      setStep('phone');
                      setOtpDigits(['', '', '', '', '', '']);
                    }}
                    disabled={isLoading}
                    className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
                  >
                    Change phone number
                  </button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Didn't receive OTP?{' '}
                  {resendCooldown > 0 ? (
                    <span className="text-muted-foreground font-medium">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      onClick={handlePhoneOTP}
                      disabled={isLoading}
                      className="text-primary font-medium hover:underline disabled:opacity-50"
                    >
                      Resend
                    </button>
                  )}
                </p>
              </div>
            </motion.div>
          )}

          {/* Profile Completion Step */}
          {step === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full max-w-md mx-auto"
            >
              {/* Welcome Header with Icon */}
              <motion.div 
                className="text-center mb-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <motion.div 
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <User className="w-10 h-10 text-primary" />
                </motion.div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Almost there!
                </h1>
                <p className="text-muted-foreground">
                  Tell us a bit about yourself
                </p>
              </motion.div>
              
              <div className="space-y-6">
                {/* Full Name Input */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  <Label htmlFor="fullName" className="text-sm font-medium flex items-center gap-1">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center transition-colors group-focus-within:bg-primary/20">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onBlur={() => fullName && validateField('fullName', fullName)}
                      className={`h-14 pl-16 text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20 ${errors.fullName ? 'border-destructive ring-destructive/20' : ''}`}
                      autoFocus
                    />
                  </div>
                  {errors.fullName && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-destructive flex items-center gap-1"
                    >
                      {errors.fullName}
                    </motion.p>
                  )}
                </motion.div>

                {/* Email Input */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    Email 
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Optional</span>
                  </Label>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center transition-colors group-focus-within:bg-primary/20">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => email && validateField('email', email)}
                      className={`h-14 pl-16 text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20 ${errors.email ? 'border-destructive ring-destructive/20' : ''}`}
                    />
                  </div>
                  {errors.email && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-destructive"
                    >
                      {errors.email}
                    </motion.p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                    For booking confirmations and exclusive offers
                  </p>
                </motion.div>

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                >
                  <Button
                    className="w-full h-14 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                    onClick={handleProfileComplete}
                    disabled={isLoading || !fullName.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : null}
                    Get Started
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
      </div>

      {/* Terms & Conditions Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Terms & Conditions</DialogTitle>
            <DialogDescription>
              Last updated: December 2024
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[50vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <section>
                <h3 className="font-semibold text-foreground mb-2">1. Acceptance of Terms</h3>
                <p>By accessing and using Grumming, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our services.</p>
              </section>
              
              <section>
                <h3 className="font-semibold text-foreground mb-2">2. Services</h3>
                <p>Grumming provides a platform to discover and book appointments at salons and spas. We act as an intermediary between customers and service providers.</p>
              </section>
              
              <section>
                <h3 className="font-semibold text-foreground mb-2">3. User Accounts</h3>
                <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information and keep it updated.</p>
              </section>
              
              <section>
                <h3 className="font-semibold text-foreground mb-2">4. Bookings & Cancellations</h3>
                <p>Bookings are subject to availability. Cancellation policies vary by salon. Please review individual salon policies before booking.</p>
              </section>
              
              <section>
                <h3 className="font-semibold text-foreground mb-2">5. Payments</h3>
                <p>All payments are processed securely. Prices displayed include applicable taxes unless stated otherwise. Refunds are subject to our refund policy.</p>
              </section>
              
              <section>
                <h3 className="font-semibold text-foreground mb-2">6. User Conduct</h3>
                <p>Users must not misuse the platform, engage in fraudulent activities, or violate any applicable laws while using our services.</p>
              </section>
              
              <section>
                <h3 className="font-semibold text-foreground mb-2">7. Limitation of Liability</h3>
                <p>Grumming is not liable for any damages arising from the use of our platform or services provided by third-party salons.</p>
              </section>
              
              <section>
                <h3 className="font-semibold text-foreground mb-2">8. Changes to Terms</h3>
                <p>We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of updated terms.</p>
              </section>
            </div>
          </ScrollArea>
          <div className="pt-4 border-t">
            <Button onClick={() => setShowTermsModal(false)} className="w-full">
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
            <DialogDescription>
              Last updated: December 2024
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[50vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <section>
                <h3 className="font-semibold text-foreground mb-2">1. Information We Collect</h3>
                <p>We collect information you provide directly, including your name, phone number, and booking preferences to deliver our services.</p>
              </section>
              
              <section>
                <h3 className="font-semibold text-foreground mb-2">2. How We Use Your Information</h3>
                <p>Your information is used to process bookings, provide customer support, send notifications, and improve our services.</p>
              </section>
              
              <section>
                <h3 className="font-semibold text-foreground mb-2">3. Information Sharing</h3>
                <p>We share necessary booking details with salons to fulfill your appointments. We do not sell your personal information to third parties.</p>
              </section>
              
              <section>
                <h3 className="font-semibold text-foreground mb-2">4. Data Security</h3>
                <p>We implement industry-standard security measures to protect your data. However, no method of transmission is 100% secure.</p>
              </section>
              
              <section>
                <h3 className="font-semibold text-foreground mb-2">5. Cookies & Tracking</h3>
                <p>We use cookies to enhance your experience, analyze usage patterns, and personalize content.</p>
              </section>
              
              <section>
                <h3 className="font-semibold text-foreground mb-2">6. Your Rights</h3>
                <p>You have the right to access, correct, or delete your personal information. Contact us to exercise these rights.</p>
              </section>
              
              <section>
                <h3 className="font-semibold text-foreground mb-2">7. Data Retention</h3>
                <p>We retain your data as long as your account is active or as needed to provide services and comply with legal obligations.</p>
              </section>
              
              <section>
                <h3 className="font-semibold text-foreground mb-2">8. Contact Us</h3>
                <p>For privacy-related inquiries, please contact us at privacy@grumming.com</p>
              </section>
            </div>
          </ScrollArea>
          <div className="pt-4 border-t">
            <Button onClick={() => setShowPrivacyModal(false)} className="w-full">
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* No Account Found Modal */}
      <Dialog open={showNoAccountModal} onOpenChange={setShowNoAccountModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl">No account found</DialogTitle>
            <DialogDescription className="text-center pt-2">
              This number is not registered. Switch to sign up to create an account.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4 space-y-3">
            <Button 
              onClick={() => {
                setShowNoAccountModal(false);
                setIsSignUp(true);
                setTimeout(() => {
                  void sendOtp(true);
                }, 0);
              }} 
              className="w-full h-12"
            >
              Sign Up & Send OTP
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setShowNoAccountModal(false);
                setStep('phone');
                setPhone('');
                setOtpDigits(['', '', '', '', '', '']);
              }} 
              className="w-full"
            >
              Use Different Number
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Auth;
