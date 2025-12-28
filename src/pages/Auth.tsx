import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowLeft, Loader2, Gift, ChevronDown, ClipboardPaste, Sparkles, Shield, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useReferral } from '@/hooks/useReferral';
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


const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits').regex(/^[0-9]+$/, 'Please enter a valid phone number');
const otpSchema = z.string().length(6, 'OTP must be 6 digits');

type AuthStep = 'phone' | 'otp';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const { applyReferralCode } = useReferral();
  
  const referralCodeFromUrl = searchParams.get('ref');
  
  const [step, setStep] = useState<AuthStep>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [showReferralSuccess, setShowReferralSuccess] = useState(false);
  const [showReferralInput, setShowReferralInput] = useState(!!referralCodeFromUrl);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  
  // Form fields
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [referralCode, setReferralCode] = useState(referralCodeFromUrl || '');
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otpComplete, setOtpComplete] = useState(false);

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
      if (referralCode) {
        applyReferralCode(referralCode).then(() => {
          // Show the referral success animation
          setShowReferralSuccess(true);
        }).catch(() => {
          // Referral failed, just navigate
          navigate('/');
        });
      } else {
        navigate('/');
      }
    }
  }, [user, loading, navigate, referralCode, applyReferralCode]);

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

  const handlePhoneOTP = async () => {
    if (!validateField('phone', phone)) return;
    
    const formattedPhone = `+91${phone}`;
    
    setIsLoading(true);
    
    try {
      // Call the edge function to send OTP via Fast2SMS
      const { data, error } = await supabase.functions.invoke('send-sms-otp', {
        body: { phone: formattedPhone },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send OTP');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send OTP');
      }

      setStep('otp');
      toast({
        title: 'OTP Sent!',
        description: 'Please check your phone for the verification code.',
      });

      // In dev mode, show the OTP in toast if returned
      if (data.debug_otp) {
        console.log('Debug OTP:', data.debug_otp);
        toast({
          title: 'Dev Mode',
          description: `OTP: ${data.debug_otp}`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send OTP',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    if (!validateField('otp', otp)) return;
    
    const formattedPhone = `+91${phone}`;
    
    setIsLoading(true);
    
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
      }
      
      toast({
        title: data.isNewUser ? 'Account Created!' : 'Welcome Back!',
        description: 'Logging you in...',
      });
      
      // Redirect to the magic link URL to establish session
      if (data.verificationUrl) {
        window.location.href = data.verificationUrl;
      } else {
        // Fallback: navigate to home and let auth state update
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
  };

  const goBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtpDigits(['', '', '', '', '', '']);
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
      
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex flex-col relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating orbs */}
          <motion.div 
            className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br from-primary/30 to-accent/20 rounded-full blur-3xl"
            animate={{ 
              y: [0, -30, 0],
              x: [0, 20, 0],
              scale: [1, 1.1, 1],
              rotate: [0, 10, 0]
            }}
            transition={{ 
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-accent/25 to-primary/15 rounded-full blur-3xl"
            animate={{ 
              y: [0, 25, 0],
              x: [0, -15, 0],
              scale: [1, 1.15, 1]
            }}
            transition={{ 
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
          <motion.div 
            className="absolute top-1/3 right-1/4 w-48 h-48 bg-primary/10 rounded-full blur-2xl"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          
          {/* Floating sparkles */}
          <motion.div
            className="absolute top-1/4 left-1/4"
            animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4 text-primary/40" />
          </motion.div>
          <motion.div
            className="absolute bottom-1/3 right-1/3"
            animate={{ y: [0, -15, 0], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
          >
            <Star className="w-3 h-3 text-accent/50" />
          </motion.div>
        </div>
        
        {/* Header */}
        <header className="relative z-10 p-4 flex items-center justify-between">
          <motion.button 
            onClick={goBack} 
            className="p-2.5 rounded-full bg-background/60 backdrop-blur-md border border-border/50 hover:bg-background/80 transition-all shadow-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>
          
          {/* Trust badge */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20"
          >
            <Shield className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs font-medium text-green-700">100% Secure</span>
          </motion.div>
        </header>

      <div className="flex-1 flex flex-col px-6 py-6 lg:py-12 lg:justify-center relative z-10">
        <AnimatePresence mode="wait">
          {/* Phone Number Step */}
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full max-w-md mx-auto"
            >
              {/* Glassmorphism card */}
              <motion.div 
                className="bg-background/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-border/50"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                {/* Header with icon */}
                <div className="text-center mb-8">
                  <motion.div 
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4 shadow-lg shadow-primary/25"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  >
                    <Sparkles className="w-8 h-8 text-primary-foreground" />
                  </motion.div>
                  
                  <motion.h1 
                    className="text-3xl font-bold text-foreground"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {isSignUp ? 'Sign up' : 'Welcome back'}
                  </motion.h1>
                  <motion.p 
                    className="text-muted-foreground mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    or{' '}
                    <button 
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-primary font-semibold hover:text-primary/80 transition-colors underline underline-offset-4 decoration-2 decoration-primary/50 hover:decoration-primary"
                    >
                      {isSignUp ? 'login to your account' : 'create an account'}
                    </button>
                  </motion.p>
                </div>
              
                <div className="space-y-5">
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Label htmlFor="phone" className="text-sm font-semibold text-foreground">
                      Phone Number
                    </Label>
                    <div className="flex gap-3">
                      <motion.div 
                        className="w-20 h-13 rounded-xl border border-border bg-muted/50 flex items-center justify-center text-sm font-semibold shadow-sm"
                        whileHover={{ scale: 1.02 }}
                      >
                        🇮🇳 +91
                      </motion.div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter mobile number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        onBlur={() => phone && validateField('phone', phone)}
                        className={`flex-1 h-13 text-lg font-medium rounded-xl border-2 bg-background/50 focus:bg-background transition-all ${errors.phone ? 'border-destructive' : 'border-border focus:border-primary'}`}
                      />
                    </div>
                    {errors.phone && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-destructive font-medium"
                      >
                        {errors.phone}
                      </motion.p>
                    )}
                  </motion.div>

                  {/* Referral Code Field - Collapsible */}
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowReferralInput(!showReferralInput)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Gift className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {referralCode ? `Referral: ${referralCode}` : 'Have a referral code?'}
                        </span>
                      </div>
                      <ChevronDown 
                        className={`w-5 h-5 text-primary transition-transform duration-300 ${
                          showReferralInput ? 'rotate-180' : ''
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
                        <div className="pt-2 space-y-2">
                          <div className="relative">
                            <Input
                              id="referral"
                              type="text"
                              placeholder="Enter referral code"
                              value={referralCode}
                              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                              className="h-12 uppercase tracking-wider pr-12"
                              maxLength={8}
                              autoFocus
                            />
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
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                              title="Paste from clipboard"
                            >
                              <ClipboardPaste className="w-5 h-5" />
                            </button>
                          </div>
                          {referralCode && (
                            <motion.p 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-primary flex items-center gap-1"
                            >
                              🎁 You'll get ₹100 off your first booking!
                            </motion.p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Button
                      className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
                      onClick={handlePhoneOTP}
                      disabled={isLoading || phone.length < 10}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <Phone className="w-5 h-5 mr-2" />
                      )}
                      Continue
                    </Button>
                  </motion.div>

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
            </motion.div>
          )}

          {/* OTP Verification Step */}
          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full max-w-md mx-auto"
            >
              {/* Glassmorphism card */}
              <motion.div 
                className="bg-background/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-border/50"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                {/* Header with icon */}
                <div className="text-center mb-8">
                  <motion.div 
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4 shadow-lg shadow-primary/25"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  >
                    <Shield className="w-8 h-8 text-primary-foreground" />
                  </motion.div>
                  
                  <motion.h1 
                    className="text-3xl font-bold text-foreground"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Verify OTP
                  </motion.h1>
                  <motion.p 
                    className="text-muted-foreground mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    Sent to <span className="font-semibold text-foreground">+91 {phone}</span>
                  </motion.p>
                </div>
              
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

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
                    onClick={() => handleVerifyOTP(otpDigits.join(''))}
                    disabled={isLoading || otpDigits.join('').length < 6}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : null}
                    Verify
                  </Button>
                </motion.div>

                <div className="text-center space-y-3">
                  <button
                    onClick={() => {
                      setStep('phone');
                      setOtpDigits(['', '', '', '', '', '']);
                    }}
                    disabled={isLoading}
                    className="text-sm text-primary font-semibold hover:underline disabled:opacity-50"
                  >
                    Change phone number
                  </button>

                  <p className="text-xs text-muted-foreground">
                    Didn't receive OTP?{' '}
                    <button
                      onClick={handlePhoneOTP}
                      disabled={isLoading}
                      className="text-primary font-semibold hover:underline disabled:opacity-50"
                    >
                      Resend
                    </button>
                  </p>
                </div>
              </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
    </>
  );
};

export default Auth;
