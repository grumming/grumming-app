import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentOptions {
  amount: number;
  bookingId?: string;
  salonName: string;
  serviceName: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
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
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Validate bookingId is required for secure payment
      if (!options.bookingId) {
        throw new Error('Booking ID is required for payment');
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
            booking_id: options.bookingId, // Required for server-side validation
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
