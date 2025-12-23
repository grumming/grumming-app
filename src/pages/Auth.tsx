import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits').regex(/^\+?[0-9]+$/, 'Please enter a valid phone number');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const otpSchema = z.string().length(6, 'OTP must be 6 digits');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

type AuthMethod = 'email' | 'phone';
type AuthStep = 'method' | 'credentials' | 'otp' | 'signup' | 'email-otp';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [step, setStep] = useState<AuthStep>('method');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  
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
        case 'email':
          emailSchema.parse(value);
          break;
        case 'phone':
          phoneSchema.parse(value);
          break;
        case 'password':
          passwordSchema.parse(value);
          break;
        case 'otp':
          otpSchema.parse(value);
          break;
        case 'fullName':
          nameSchema.parse(value);
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

  const handleEmailSignIn = async () => {
    if (!validateField('email', email) || !validateField('password', password)) return;
    
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast({
          title: 'Invalid credentials',
          description: 'Email or password is incorrect. Try again or sign up.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      navigate('/');
    }
  };

  const handleEmailSignUp = async () => {
    if (!validateField('email', email) || !validateField('password', password) || !validateField('fullName', fullName)) return;
    
    setIsLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    setIsLoading(false);
    if (error) {
      if (error.message.includes('already registered')) {
        toast({
          title: 'Account exists',
          description: 'This email is already registered. Please sign in instead.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Account created!',
        description: 'Welcome to Grumming. You can now book appointments.',
      });
      navigate('/');
    }
  };

  const handlePhoneOTP = async () => {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    if (!validateField('phone', formattedPhone)) return;
    
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

  const handleEmailOTP = async () => {
    if (!validateField('email', email)) return;
    
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    setIsLoading(false);
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setStep('email-otp');
      toast({
        title: 'OTP Sent!',
        description: 'Please check your email for the verification code.',
      });
    }
  };

  const handleVerifyEmailOTP = async () => {
    if (!validateField('otp', otp)) return;
    
    setIsLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    setIsLoading(false);
    if (error) {
      toast({
        title: 'Invalid OTP',
        description: 'The code you entered is incorrect. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome!',
        description: 'You have successfully logged in.',
      });
      navigate('/');
    }
  };

  const handleVerifyOTP = async () => {
    if (!validateField('otp', otp)) return;
    
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    
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
        description: 'You have successfully logged in.',
      });
      
      // Redirect and let auth state listener pick up the session
      window.location.href = '/';
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
    if (step === 'otp') setStep('credentials');
    else if (step === 'email-otp') setStep('credentials');
    else if (step === 'credentials' || step === 'signup') setStep('method');
    else navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center">
        <button onClick={goBack} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-elegant">
            <span className="text-primary-foreground font-display font-bold text-2xl">G</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Grumming</h1>
          <p className="text-muted-foreground mt-2">Book your perfect beauty experience</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Step 1: Choose Method */}
          {step === 'method' && (
            <motion.div
              key="method"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-sm space-y-4"
            >
              <h2 className="text-xl font-semibold text-center mb-6">Sign in or create account</h2>
              
              <Button
                variant="outline"
                className="w-full h-14 justify-start gap-4 text-left"
                onClick={() => { setAuthMethod('email'); setStep('credentials'); }}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Continue with Email</p>
                  <p className="text-xs text-muted-foreground">Sign in with your email & password</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-14 justify-start gap-4 text-left"
                onClick={() => { setAuthMethod('phone'); setStep('credentials'); }}
              >
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-medium">Continue with Phone</p>
                  <p className="text-xs text-muted-foreground">Get OTP on your mobile number</p>
                </div>
              </Button>
            </motion.div>
          )}

          {/* Step 2: Email Credentials */}
          {step === 'credentials' && authMethod === 'email' && (
            <motion.div
              key="email-credentials"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-sm space-y-4"
            >
              <h2 className="text-xl font-semibold text-center mb-6">Sign in with Email</h2>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => email && validateField('email', email)}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => password && validateField('password', password)}
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <Button
                className="w-full h-12"
                onClick={handleEmailSignIn}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-12"
                onClick={handleEmailOTP}
                disabled={isLoading || !email}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send OTP to Email
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <button
                    onClick={() => setStep('signup')}
                    className="text-primary font-medium hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {/* Email Signup */}
          {step === 'signup' && (
            <motion.div
              key="email-signup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-sm space-y-4"
            >
              <h2 className="text-xl font-semibold text-center mb-6">Create Account</h2>
              
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => fullName && validateField('fullName', fullName)}
                  className={errors.fullName ? 'border-destructive' : ''}
                />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signupEmail">Email Address</Label>
                <Input
                  id="signupEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => email && validateField('email', email)}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signupPassword">Password</Label>
                <div className="relative">
                  <Input
                    id="signupPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => password && validateField('password', password)}
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <Button
                className="w-full h-12"
                onClick={handleEmailSignUp}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Account
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    onClick={() => setStep('credentials')}
                    className="text-primary font-medium hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 2: Phone Number */}
          {step === 'credentials' && authMethod === 'phone' && (
            <motion.div
              key="phone-credentials"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-sm space-y-4"
            >
              <h2 className="text-xl font-semibold text-center mb-6">Enter Phone Number</h2>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <div className="flex gap-2">
                  <div className="w-20 h-10 rounded-md border border-input bg-background flex items-center justify-center text-sm">
                    +91
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter 10 digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onBlur={() => phone && validateField('phone', phone)}
                    className={`flex-1 ${errors.phone ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>

              <Button
                className="w-full h-12"
                onClick={handlePhoneOTP}
                disabled={isLoading || phone.length < 10}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send OTP
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </motion.div>
          )}

          {/* Step 3: Phone OTP Verification */}
          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-sm space-y-4"
            >
              <h2 className="text-xl font-semibold text-center mb-2">Verify OTP</h2>
              <p className="text-sm text-center text-muted-foreground mb-6">
                Enter the 6-digit code sent to +91{phone}
              </p>
              
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`text-center text-2xl tracking-widest h-14 ${errors.otp ? 'border-destructive' : ''}`}
                  maxLength={6}
                />
                {errors.otp && <p className="text-xs text-destructive text-center">{errors.otp}</p>}
              </div>

              <Button
                className="w-full h-12"
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Verify & Continue
              </Button>

              <div className="text-center">
                <button
                  onClick={handlePhoneOTP}
                  className="text-sm text-primary font-medium hover:underline"
                  disabled={isLoading}
                >
                  Resend OTP
                </button>
              </div>
            </motion.div>
          )}

          {/* Email OTP Verification */}
          {step === 'email-otp' && (
            <motion.div
              key="email-otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-sm space-y-4"
            >
              <h2 className="text-xl font-semibold text-center mb-2">Verify Email OTP</h2>
              <p className="text-sm text-center text-muted-foreground mb-6">
                Enter the 6-digit code sent to {email}
              </p>
              
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`text-center text-2xl tracking-widest h-14 ${errors.otp ? 'border-destructive' : ''}`}
                  maxLength={6}
                />
                {errors.otp && <p className="text-xs text-destructive text-center">{errors.otp}</p>}
              </div>

              <Button
                className="w-full h-12"
                onClick={handleVerifyEmailOTP}
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Verify & Continue
              </Button>

              <div className="text-center">
                <button
                  onClick={handleEmailOTP}
                  className="text-sm text-primary font-medium hover:underline"
                  disabled={isLoading}
                >
                  Resend OTP
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
