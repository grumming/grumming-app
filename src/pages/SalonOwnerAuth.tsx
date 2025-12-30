import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, Loader2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits').regex(/^[0-9]+$/, 'Please enter a valid phone number');
const otpSchema = z.string().length(6, 'OTP must be 6 digits');

const TEST_PHONE_NUMBERS = ['9262582899', '7004414512', '9534310739', '9135812785'];

type AuthStep = 'phone' | 'otp';

const SalonOwnerAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  
  const [step, setStep] = useState<AuthStep>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already logged in - check if salon owner first
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (!loading && user) {
        // Check if user has any salon ownership records
        const { data: ownershipData } = await supabase
          .from('salon_owners')
          .select(`
            salons (
              id,
              is_active
            )
          `)
          .eq('user_id', user.id);

        if (ownershipData && ownershipData.length > 0) {
          // User has salon(s) - go to dashboard to see status
          navigate('/salon-dashboard');
        } else {
          // No salons - go to registration
          navigate('/salon-registration');
        }
      }
    };
    checkAndRedirect();
  }, [user, loading, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validateField = (field: string, value: string) => {
    try {
      if (field === 'phone') phoneSchema.parse(value);
      if (field === 'otp') otpSchema.parse(value);
      setErrors(prev => ({ ...prev, [field]: '' }));
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [field]: err.errors[0].message }));
      }
      return false;
    }
  };

  const handleSendOTP = async () => {
    if (!validateField('phone', phone)) return;
    
    setIsLoading(true);
    const formattedPhone = `+91${phone}`;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ phone: formattedPhone, isSignUp: true }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        // Allow login if account exists
        if (data?.code === 'ACCOUNT_EXISTS') {
          const loginResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms-otp`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ phone: formattedPhone, isSignUp: false }),
            }
          );
          const loginData = await loginResponse.json();
          if (!loginResponse.ok || !loginData?.success) {
            throw new Error(loginData?.error || 'Failed to send OTP');
          }
        } else {
          throw new Error(data?.error || 'Failed to send OTP');
        }
      }

      setStep('otp');
      setResendCooldown(30);
      toast({
        title: 'OTP Sent!',
        description: 'Check your phone for the verification code.',
      });
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

  const handleVerifyOTP = useCallback(async (otp: string) => {
    if (!validateField('otp', otp)) return;
    
    setIsLoading(true);
    const formattedPhone = `+91${phone}`;

    try {
      const { data, error } = await supabase.functions.invoke('verify-sms-otp', {
        body: { phone: formattedPhone, otp },
      });

      if (error) throw new Error(error.message || 'Failed to verify OTP');
      if (!data?.success) throw new Error(data?.error || 'Invalid OTP');

      toast({
        title: 'Verified!',
        description: 'Redirecting...',
      });

      if (data.verificationUrl) {
        localStorage.setItem('pendingSalonOwnerRegistration', 'true');
        window.location.href = data.verificationUrl;
      } else {
        // Check if user already has salons (pending or active)
        const { data: ownershipData } = await supabase
          .from('salon_owners')
          .select(`
            salons (
              id,
              is_active
            )
          `)
          .eq('user_id', data.user?.id);

        if (ownershipData && ownershipData.length > 0) {
          // User has salon(s) - go to dashboard to see status
          navigate('/salon-dashboard');
        } else {
          navigate('/salon-registration');
        }
      }
    } catch (error: any) {
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid code',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [phone, navigate, toast]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const fullOtp = newDigits.join('');
    if (fullOtp.length === 6) {
      handleVerifyOTP(fullOtp);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const isTestNumber = TEST_PHONE_NUMBERS.includes(phone);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center gap-3 border-b">
        <button 
          onClick={() => navigate('/auth')} 
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" />
          <span className="font-semibold">Salon Partner</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6"
        >
          {step === 'phone' ? (
            <>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Salon Owner Login</h1>
                <p className="text-muted-foreground text-sm">
                  Enter your phone number to access your salon dashboard or register a new salon
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center px-3 bg-muted rounded-lg text-sm font-medium">
                      +91
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="Enter mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className={errors.phone ? 'border-destructive' : ''}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone}</p>
                  )}
                  {isTestNumber && (
                    <p className="text-xs text-muted-foreground">🧪 Test Mode - Use OTP: 111456</p>
                  )}
                </div>

                <Button
                  onClick={handleSendOTP}
                  disabled={isLoading || phone.length < 10}
                  className="w-full"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Verify OTP</h1>
                <p className="text-muted-foreground text-sm">
                  Enter the 6-digit code sent to +91 {phone}
                </p>
                {isTestNumber && (
                  <p className="text-xs text-primary font-medium">🧪 Test Mode - Use OTP: 111456</p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-center gap-2">
                  {otpDigits.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-12 text-center text-lg font-semibold"
                    />
                  ))}
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setStep('phone')}
                    className="text-sm text-primary hover:underline"
                  >
                    Change number
                  </button>
                  {resendCooldown > 0 ? (
                    <p className="text-xs text-muted-foreground mt-2">
                      Resend in {resendCooldown}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      className="block mx-auto text-sm text-primary hover:underline mt-2"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                {isLoading && (
                  <div className="flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SalonOwnerAuth;
