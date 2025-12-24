import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits').regex(/^[0-9]+$/, 'Please enter a valid phone number');
const otpSchema = z.string().length(6, 'OTP must be 6 digits');

type AuthStep = 'phone' | 'otp';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  
  const [step, setStep] = useState<AuthStep>('phone');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  
  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ phone: formattedPhone }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setStep('otp');
      toast({
        title: 'OTP Sent!',
        description: 'Please check your phone for the verification code.',
      });
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

  const handleVerifyOTP = async () => {
    if (!validateField('otp', otp)) return;
    
    const formattedPhone = `+91${phone}`;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-sms-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ phone: formattedPhone, otp }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

      toast({
        title: data.isNewUser ? 'Account Created!' : 'Welcome Back!',
        description: 'Logging you in...',
      });
      
      if (data.verificationUrl) {
        window.location.href = data.verificationUrl;
      } else {
        window.location.href = '/';
      }
    } catch (error: any) {
      toast({
        title: 'Invalid OTP',
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
      setOtp('');
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

      <div className="flex-1 flex flex-col px-6 py-8">
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
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={`text-center text-2xl tracking-[0.5em] h-14 font-mono ${errors.otp ? 'border-destructive' : ''}`}
                    maxLength={6}
                    autoFocus
                  />
                  {errors.otp && <p className="text-xs text-destructive text-center">{errors.otp}</p>}
                </div>

                <Button
                  className="w-full h-14 text-base font-semibold"
                  onClick={handleVerifyOTP}
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Verify
                </Button>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the OTP?
                  </p>
                  <button
                    onClick={handlePhoneOTP}
                    className="text-sm text-primary font-semibold hover:underline"
                    disabled={isLoading}
                  >
                    Resend OTP
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
