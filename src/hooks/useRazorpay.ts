import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentTestModeSettings {
  enabled: boolean;
  simulate_success: boolean;
}

interface PaymentOptions {
  amount: number;
  bookingId?: string;
  salonName: string;
  serviceName: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  penaltyAmount?: number; // Cancellation penalty from previous booking (platform revenue)
}

interface PaymentError {
  code?: string;
  reason?: string;
  description?: string;
  source?: string;
  step?: string;
  metadata?: Record<string, any>;
  isRetryable?: boolean;
}

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  error?: string;
  errorDetails?: PaymentError;
  isSimulated?: boolean;
  retryCount?: number;
}

export type { PaymentError, PaymentResult };

// Transient error codes that are safe to retry
const RETRYABLE_ERROR_CODES = [
  'GATEWAY_ERROR',
  'SERVER_ERROR',
  'NETWORK_ERROR',
  'BAD_REQUEST_ERROR', // Often transient on iOS app handoff
  'TIMEOUT_ERROR',
];

// Check if an error is retryable
function isRetryableError(error: PaymentError): boolean {
  if (!error.code) return false;
  return RETRYABLE_ERROR_CODES.includes(error.code) || 
    error.source === 'bank' || // Bank-side errors are often transient
    error.reason?.toLowerCase().includes('timeout') ||
    error.reason?.toLowerCase().includes('network');
}

// Calculate delay with exponential backoff + jitter
function getRetryDelay(attempt: number, baseDelay = 1000, maxDelay = 10000): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = Math.random() * 500; // Add 0-500ms jitter
  return exponentialDelay + jitter;
}

// Fetch payment test mode settings from database
async function getPaymentTestMode(): Promise<PaymentTestModeSettings | null> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'payment_test_mode')
      .single();

    if (error || !data) {
      return null;
    }

    return data.value as unknown as PaymentTestModeSettings;
  } catch (error) {
    console.error('Error fetching payment test mode:', error);
    return null;
  }
}

const MAX_RETRIES = 3;

// Preload Razorpay script on module load for faster checkout
let razorpayScriptPromise: Promise<boolean> | null = null;

function preloadRazorpayScript(): Promise<boolean> {
  if (razorpayScriptPromise) return razorpayScriptPromise;
  
  razorpayScriptPromise = new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="razorpay"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  
  return razorpayScriptPromise;
}

// Start preloading immediately when this module is imported
if (typeof window !== 'undefined') {
  preloadRazorpayScript();
}

// Cache for order data to speed up retries
const orderCache = new Map<string, { orderId: string; keyId: string; amount: number; currency: string; timestamp: number }>();
const ORDER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedOrder(bookingId: string) {
  const cached = orderCache.get(bookingId);
  if (cached && Date.now() - cached.timestamp < ORDER_CACHE_TTL) {
    return cached;
  }
  orderCache.delete(bookingId);
  return null;
}

function setCachedOrder(bookingId: string, data: { orderId: string; keyId: string; amount: number; currency: string }) {
  orderCache.set(bookingId, { ...data, timestamp: Date.now() });
}

export const useRazorpay = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const loadRazorpayScript = useCallback((): Promise<boolean> => {
    return preloadRazorpayScript();
  }, []);

  // Clear any pending retry timeout
  const cancelRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setRetryCount(0);
  }, []);

  const initiatePayment = useCallback(async (options: PaymentOptions, currentRetry = 0): Promise<PaymentResult> => {
    setIsLoading(true);
    setRetryCount(currentRetry);

    try {
      // Validate bookingId is required for secure payment
      if (!options.bookingId) {
        throw new Error('Booking ID is required for payment');
      }

      // Check if test mode is enabled
      const testModeSettings = await getPaymentTestMode();
      
      if (testModeSettings?.enabled) {
        console.log('Payment test mode enabled - simulating payment');
        
        // Simulate a small delay for realism
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (testModeSettings.simulate_success) {
          // Simulate successful payment
          const simulatedPaymentId = `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Update booking status directly for test mode
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ 
              status: 'confirmed',
              payment_id: simulatedPaymentId
            })
            .eq('id', options.bookingId);

          if (updateError) {
            throw new Error('Failed to update booking status');
          }
          
          toast({
            title: '✅ Test Payment Successful',
            description: 'This was a simulated payment (test mode).',
          });
          
          setIsLoading(false);
          return {
            success: true,
            paymentId: simulatedPaymentId,
            isSimulated: true,
          };
        } else {
          // Simulate failed payment
          setIsLoading(false);
          toast({
            title: '❌ Test Payment Failed',
            description: 'Simulated payment failure (test mode).',
            variant: 'destructive',
          });
          return {
            success: false,
            error: 'Simulated payment failure',
            isSimulated: true,
          };
        }
      }

      // Live mode - proceed with real Razorpay payment
      console.log('Starting Razorpay payment flow...');
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway. Please check your internet connection.');
      }

      // Verify Razorpay is available
      if (!window.Razorpay) {
        console.error('Razorpay object not available after script load');
        throw new Error('Payment gateway initialization failed');
      }

      // Check cache first for retries
      let orderData = getCachedOrder(options.bookingId!);
      
      if (!orderData) {
        // Create order with booking_id for server-side amount validation
        console.log('Creating Razorpay order...');
        const orderResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-razorpay-order`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              amount: options.amount,
              currency: 'INR',
              booking_id: options.bookingId,
              penalty_amount: options.penaltyAmount || 0, // Pass penalty for platform revenue
              // Razorpay enforces receipt length <= 40 chars
              receipt: `booking_${options.bookingId.replace(/-/g, '').slice(0, 24)}`,
              notes: {
                salon: options.salonName,
                service: options.serviceName,
              },
            }),
          }
        );

        if (!orderResponse.ok) {
          const errorData = await orderResponse.json();
          console.error('Order creation failed:', errorData);
          throw new Error(errorData.error || 'Failed to create order');
        }

        const responseData = await orderResponse.json();
        const newOrder = {
          orderId: responseData.orderId,
          keyId: responseData.keyId,
          amount: responseData.amount,
          currency: responseData.currency,
        };
        
        // Cache for retries
        setCachedOrder(options.bookingId!, newOrder);
        orderData = getCachedOrder(options.bookingId!)!;
        console.log('Order created and cached:', orderData.orderId);
      } else {
        console.log('Using cached order:', orderData.orderId);
      }

      // Open Razorpay checkout
      return new Promise((resolve) => {
        const orderId = orderData.orderId as string;

        const reconcileOnDismiss = async (): Promise<PaymentResult> => {
          try {
            const res = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reconcile-razorpay-order`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                },
                body: JSON.stringify({
                  booking_id: options.bookingId,
                  razorpay_order_id: orderId,
                }),
              }
            );

            const data = await res.json().catch(() => null);

            if (res.ok && data?.status === 'captured' && data?.payment_id) {
              return {
                success: true,
                paymentId: data.payment_id,
                orderId,
              };
            }

            if (res.ok && data?.status === 'pending') {
              return {
                success: false,
                error: 'Payment pending',
                orderId,
                errorDetails: {
                  code: 'PAYMENT_PENDING',
                  description:
                    'Your UPI payment is still processing. Please wait a minute and check My Bookings.',
                  metadata: data ?? undefined,
                },
              };
            }

            // If no payment attempt was created for this order, treat as cancelled
            return {
              success: false,
              error: 'Payment cancelled',
              orderId,
            };
          } catch (e) {
            return {
              success: false,
              error: 'Payment cancelled',
              orderId,
            };
          }
        };

        const razorpayOptions = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Grumming',
          description: `${options.serviceName} at ${options.salonName}`,
          order_id: orderId,
          prefill: {
            name: options.customerName || '',
            email: options.customerEmail || '',
            contact: options.customerPhone || '',
          },
          theme: {
            color: '#f97316',
          },
          // Allow all payment methods for better compatibility
          config: {
            display: {
              blocks: {
                banks: {
                  name: 'Methods',
                  instruments: [
                    { method: 'upi' },
                    { method: 'card' },
                    { method: 'netbanking' },
                    { method: 'wallet' },
                  ],
                },
              },
              sequence: ['block.banks'],
              preferences: {
                show_default_blocks: true, // Show all payment options
              },
            },
          },
          handler: async function (response: any) {
            try {
              // Verify payment
              const verifyResponse = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-razorpay-payment`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    booking_id: options.bookingId,
                  }),
                }
              );

              const verifyData = await verifyResponse.json();

              if (verifyData.success) {
                setIsLoading(false);
                resolve({
                  success: true,
                  paymentId: response.razorpay_payment_id,
                  orderId,
                });
              } else {
                throw new Error(verifyData.error || 'Payment verification failed');
              }
            } catch (error: any) {
              setIsLoading(false);
              resolve({
                success: false,
                error: error.message,
                orderId,
              });
            }
          },
          modal: {
            ondismiss: function () {
              void (async () => {
                toast({
                  title: 'Checking payment status…',
                  description: 'Please wait a moment.',
                });

                const result = await reconcileOnDismiss();
                setIsLoading(false);
                resolve(result);
              })();
            },
            // Enable animation and back button handling for mobile
            animation: true,
            backdropclose: false,
            escape: true,
            confirm_close: true,
          },
        };

        console.log('Initializing Razorpay checkout with options:', {
          key: orderData.keyId ? '***configured***' : 'MISSING',
          amount: razorpayOptions.amount,
          order_id: razorpayOptions.order_id,
        });

        try {
          const razorpay = new window.Razorpay(razorpayOptions);
          
          razorpay.on('payment.failed', async function (response: any) {
            const err = response?.error;
            console.error('Razorpay payment.failed', err, `Attempt ${currentRetry + 1}/${MAX_RETRIES + 1}`);
            
            const errorDetails: PaymentError = {
              code: err?.code,
              reason: err?.reason,
              description: err?.description,
              source: err?.source,
              step: err?.step,
              metadata: err?.metadata,
              isRetryable: isRetryableError({
                code: err?.code,
                reason: err?.reason,
                source: err?.source,
              }),
            };
            
            // Check if we should auto-retry
            if (errorDetails.isRetryable && currentRetry < MAX_RETRIES) {
              const delay = getRetryDelay(currentRetry);
              console.log(`Retryable error detected. Retrying in ${Math.round(delay)}ms...`);
              
              toast({
                title: 'Payment issue detected',
                description: `Retrying automatically (${currentRetry + 1}/${MAX_RETRIES})...`,
              });
              
              // Schedule retry with exponential backoff
              retryTimeoutRef.current = setTimeout(async () => {
                const retryResult = await initiatePayment(options, currentRetry + 1);
                resolve(retryResult);
              }, delay);
              
              return; // Don't resolve yet, wait for retry
            }
            
            setIsLoading(false);
            setRetryCount(0);
            
            resolve({
              success: false,
              error: err?.description || err?.reason || err?.code || 'Payment failed',
              errorDetails,
              retryCount: currentRetry,
              orderId: orderData.orderId,
            });
          });
          
          console.log('Opening Razorpay checkout...');
          razorpay.open();
        } catch (razorpayError: any) {
          console.error('Error creating Razorpay instance:', razorpayError);
          setIsLoading(false);
          resolve({
            success: false,
            error: razorpayError.message || 'Failed to open payment checkout',
          });
        }
      });
    } catch (error: any) {
      setIsLoading(false);
      setRetryCount(0);
      toast({
        title: 'Payment Error',
        description: error.message,
        variant: 'destructive',
      });
      return {
        success: false,
        error: error.message,
        retryCount: currentRetry,
      };
    }
  }, [loadRazorpayScript, toast]);

  return {
    initiatePayment,
    isLoading,
    retryCount,
    cancelRetry,
  };
};
