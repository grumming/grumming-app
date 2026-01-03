import { useState, useCallback } from 'react';
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

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
  isSimulated?: boolean;
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

export const useRazorpay = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadRazorpayScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const initiatePayment = useCallback(async (options: PaymentOptions): Promise<PaymentResult> => {
    setIsLoading(true);

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
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create order with booking_id for server-side amount validation
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
            receipt: `booking_${options.bookingId}`,
            notes: {
              salon: options.salonName,
              service: options.serviceName,
            },
          }),
        }
      );

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();

      // Open Razorpay checkout
      return new Promise((resolve) => {
        const razorpayOptions = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Grumming',
          description: `${options.serviceName} at ${options.salonName}`,
          order_id: orderData.orderId,
          prefill: {
            name: options.customerName || '',
            email: options.customerEmail || '',
            contact: options.customerPhone || '',
          },
          theme: {
            color: '#f97316',
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
                    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
                });
              } else {
                throw new Error(verifyData.error || 'Payment verification failed');
              }
            } catch (error: any) {
              setIsLoading(false);
              resolve({
                success: false,
                error: error.message,
              });
            }
          },
          modal: {
            ondismiss: function () {
              setIsLoading(false);
              resolve({
                success: false,
                error: 'Payment cancelled',
              });
            },
          },
        };

        const razorpay = new window.Razorpay(razorpayOptions);
        razorpay.on('payment.failed', function (response: any) {
          setIsLoading(false);
          resolve({
            success: false,
            error: response.error.description || 'Payment failed',
          });
        });
        razorpay.open();
      });
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: 'Payment Error',
        description: error.message,
        variant: 'destructive',
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }, [loadRazorpayScript, toast]);

  return {
    initiatePayment,
    isLoading,
  };
};
