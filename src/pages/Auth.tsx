import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowLeft, Loader2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useReferral } from '@/hooks/useReferral';
import { supabase } from '@/integrations/supabase/client';
import { ReferralSuccessAnimation } from '@/components/ReferralSuccessAnimation';
import { z } from 'zod';


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
  const [showReferralSuccess, setShowReferralSuccess] = useState(false);
  
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
      
      <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-border">
        <button onClick={goBack} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">G</span>
          </div>
          <span className="font-bold text-lg text-foreground">Grumming</span>
        </div>
        <div className="w-10" />
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
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Login or create account
              </h1>
              <p className="text-muted-foreground mb-8">
                Enter your phone number to continue
              </p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Phone Number
                  </Label>
                  <div className="flex gap-3">
                    <div className="w-20 h-12 rounded-lg border border-input bg-muted/50 flex items-center justify-center text-sm font-medium">
                      🇮🇳 +91
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      onBlur={() => phone && validateField('phone', phone)}
                      className={`flex-1 h-12 text-lg ${errors.phone ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>

                {/* Referral Code Field */}
                <div className="space-y-2">
                  <Label htmlFor="referral" className="text-sm font-medium flex items-center gap-2">
                    <Gift className="w-4 h-4 text-primary" />
                    Referral Code (Optional)
                  </Label>
                  <Input
                    id="referral"
                    type="text"
                    placeholder="Enter referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="h-12 uppercase tracking-wider"
                    maxLength={8}
                  />
                  {referralCode && (
                    <p className="text-xs text-primary">🎁 You'll get ₹100 off your first booking!</p>
                  )}
                </div>

                <Button
                  className="w-full h-14 text-base font-semibold"
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

                <p className="text-xs text-center text-muted-foreground leading-relaxed">
                  By clicking on Continue, I accept the{' '}
                  <span className="text-primary font-medium">Terms & Conditions</span>
                  {' '}and{' '}
                  <span className="text-primary font-medium">Privacy Policy</span>
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
              <p className="text-muted-foreground mb-8">
                Sent to +91 {phone}
              </p>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  {/* Individual OTP digit boxes */}
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {otpDigits.map((digit, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <input
                          ref={(el) => (otpInputRefs.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          autoFocus={index === 0}
                          disabled={isLoading}
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
                            w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-bold 
                            border-2 rounded-xl transition-all duration-200
                            bg-background text-foreground
                            ${digit ? 'border-primary' : 'border-input'}
                            ${otpComplete ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}
                            focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                            disabled:opacity-50
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
                  <button
                    onClick={handlePhoneOTP}
                    disabled={isLoading}
                    className="text-primary font-medium hover:underline disabled:opacity-50"
                  >
                    Resend
                  </button>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
      </div>
    </>
  );
};

export default Auth;
