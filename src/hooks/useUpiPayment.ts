import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UpiApp {
  id: string;
  name: string;
  scheme: string;
}

const upiApps: Record<string, UpiApp> = {
  gpay: { id: 'gpay', name: 'GPay', scheme: 'tez://upi/pay' },
  phonepe: { id: 'phonepe', name: 'PhonePe', scheme: 'phonepe://pay' },
  paytm: { id: 'paytm', name: 'Paytm', scheme: 'paytmmp://pay' },
  cred: { id: 'cred', name: 'CRED', scheme: 'credpay://upi/pay' },
  amazonpay: { id: 'amazonpay', name: 'Amazon Pay', scheme: 'amazonpay://pay' },
  bhim: { id: 'bhim', name: 'BHIM', scheme: 'upi://pay' },
};

interface PaymentDetails {
  amount: number;
  merchantVpa: string;
  merchantName: string;
  transactionNote: string;
  orderId: string;
}

interface UseUpiPaymentReturn {
  initiateUpiPayment: (appId: string, paymentDetails: PaymentDetails) => Promise<{ success: boolean; error?: string }>;
  isProcessing: boolean;
}

export function useUpiPayment(): UseUpiPaymentReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const generateUpiLink = (appId: string, details: PaymentDetails): string => {
    const app = upiApps[appId] || upiApps.bhim; // Fallback to generic UPI
    
    const params = new URLSearchParams({
      pa: details.merchantVpa,
      pn: details.merchantName,
      am: details.amount.toString(),
      cu: 'INR',
      tn: `${details.transactionNote} booking_id:${details.orderId}`,
      tr: details.orderId,
      mc: '5611', // Merchant category code for salons/beauty parlors
    });

    return `${app.scheme}?${params.toString()}`;
  };

  const initiateUpiPayment = useCallback(async (
    appId: string,
    paymentDetails: PaymentDetails
  ): Promise<{ success: boolean; error?: string }> => {
    setIsProcessing(true);

    try {
      const app = upiApps[appId];
      if (!app) {
        throw new Error('Invalid UPI app selected');
      }

      const upiLink = generateUpiLink(appId, paymentDetails);

      // Show toast that we're opening the app
      toast({
        title: `Opening ${app.name}`,
        description: 'Complete the payment in the app to confirm your booking.',
      });

      // Try to open the UPI app
      window.location.href = upiLink;

      // Since we can't detect if the app opened successfully,
      // we'll return success and let the UI handle the pending state
      // In a production app, you'd use a payment gateway callback
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to open UPI app';
      toast({
        title: 'Payment Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  return {
    initiateUpiPayment,
    isProcessing,
  };
}

export function getUpiAppName(appId: string): string {
  return upiApps[appId]?.name || 'UPI App';
}

export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}
