import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Loader2, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PaymentMethodSelector, PaymentMethodType } from './PaymentMethodSelector';
import { PaymentReceipt } from './PaymentReceipt';
import { PaymentFailureBanner } from './PaymentFailureBanner';
import { useRazorpay, PaymentError } from '@/hooks/useRazorpay';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { usePendingPenalties } from '@/hooks/usePendingPenalties';
import { supabase } from '@/integrations/supabase/client';

interface BookingPaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    salon_id?: string;
    salon_name: string;
    service_name: string;
    service_price: number;
    booking_date?: string;
    booking_time?: string;
  };
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onPaymentSuccess: () => void;
}

interface ReceiptData {
  bookingId: string;
  paymentId: string;
  salonName: string;
  serviceName: string;
  amount: number;
  walletAmount?: number;
  paidAmount: number;
  paymentMethod: string;
  bookingDate?: string;
  bookingTime?: string;
  paidAt: Date;
}

export function BookingPaymentSheet({
  open,
  onOpenChange,
  booking,
  customerName,
  customerEmail,
  customerPhone,
  onPaymentSuccess,
}: BookingPaymentSheetProps) {
  const { toast } = useToast();
  const { initiatePayment, isLoading: razorpayLoading, retryCount } = useRazorpay();
  const { wallet, useCredits } = useWallet();
  const { totalPenalty, hasPenalties, markPenaltiesAsPaid } = usePendingPenalties();
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('upi');
  const [walletAmountToUse, setWalletAmountToUse] = useState(0);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [selectedSavedMethodId, setSelectedSavedMethodId] = useState<string | null>(null);
  const [selectedUpiAppId, setSelectedUpiAppId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [paymentError, setPaymentError] = useState<PaymentError | null>(null);

  const walletBalance = wallet?.balance || 0;
  const serviceAmount = booking.service_price;
  const totalAmount = serviceAmount + totalPenalty; // Include penalty in total
  const amountToPay = isSplitPayment ? totalAmount - walletAmountToUse : totalAmount;

  const getPaymentMethodLabel = (method: PaymentMethodType) => {
    switch (method) {
      case 'upi': return 'UPI';
      case 'salon': return 'Pay at Salon';
      default: return 'UPI';
    }
  };

  const showReceiptDialog = (paymentId: string) => {
    setReceiptData({
      bookingId: booking.id,
      paymentId,
      salonName: booking.salon_name,
      serviceName: booking.service_name,
      amount: totalAmount,
      walletAmount: isSplitPayment ? walletAmountToUse : undefined,
      paidAmount: amountToPay,
      paymentMethod: getPaymentMethodLabel(paymentMethod),
      bookingDate: booking.booking_date,
      bookingTime: booking.booking_time,
      paidAt: new Date(),
    });
    setShowReceipt(true);
  };

  const handlePayNow = async () => {
    setIsProcessing(true);
    setPaymentError(null); // Clear previous errors

    try {
      // Handle pay at salon - just complete the booking and set payment_method
      if (paymentMethod === 'salon') {
        // Update booking with payment_method
        await supabase
          .from('bookings')
          .update({ payment_method: 'salon' })
          .eq('id', booking.id);

        // Mark any pending penalties as paid for cash payments
        // Track the collecting salon so we can deduct from their payout later
        if (hasPenalties && booking.salon_id) {
          await markPenaltiesAsPaid(booking.id, booking.salon_id, 'salon');
        }

        toast({
          title: 'Booking Confirmed!',
          description: `Pay ₹${totalAmount} at ${booking.salon_name}`,
        });
        onPaymentSuccess();
        onOpenChange(false);
        setIsProcessing(false);
        return;
      }

      // Handle wallet deduction for split payment
      if (isSplitPayment && walletAmountToUse > 0) {
        try {
          await useCredits({
            amount: walletAmountToUse,
            category: 'booking_discount',
            description: `Partial payment for ${booking.service_name} at ${booking.salon_name}`,
            referenceId: booking.id,
          });
        } catch (error) {
          toast({
            title: 'Wallet Deduction Failed',
            description: 'Could not deduct from wallet. Please try again.',
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }
      }

      // Handle UPI payment
      if (paymentMethod === 'upi') {
        const result = await initiatePayment({
          amount: amountToPay,
          bookingId: booking.id,
          salonName: booking.salon_name,
          serviceName: booking.service_name,
          customerName,
          customerEmail,
          customerPhone,
          penaltyAmount: hasPenalties ? totalPenalty : 0, // Pass penalty for platform revenue
        });

        if (result.success && result.paymentId) {
          // Update booking with payment_method
          await supabase
            .from('bookings')
            .update({ payment_method: 'upi', payment_id: result.paymentId })
            .eq('id', booking.id);
          
          // Mark any pending penalties as paid - UPI goes to platform directly
          if (hasPenalties) {
            await markPenaltiesAsPaid(booking.id, undefined, 'upi');
          }
            
          showReceiptDialog(result.paymentId);
          onPaymentSuccess();
        } else {
          // Set detailed error for the banner
          if (result.errorDetails) {
            setPaymentError(result.errorDetails);
          } else {
            setPaymentError({
              code: 'PAYMENT_FAILED',
              description: result.error || 'Payment could not be completed',
            });
          }
          
          // If split payment and wallet was deducted, we need to inform user
          if (isSplitPayment && walletAmountToUse > 0) {
            toast({
              title: 'Payment Failed',
              description: 'Online payment failed. Wallet amount was deducted - please contact support.',
              variant: 'destructive',
            });
          }
        }
      } else if (paymentMethod === 'split' && amountToPay > 0) {
        // For split payment with remaining amount to pay at salon
        const walletPaymentId = `WALLET-${Date.now()}`;
        showReceiptDialog(walletPaymentId);
        onPaymentSuccess();
      }
    } catch (error: any) {
      toast({
        title: 'Payment Error',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setReceiptData(null);
    onOpenChange(false);
  };

  const isLoading = razorpayLoading || isProcessing;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Pay for Booking
          </SheetTitle>
          <SheetDescription>
            {booking.service_name} at {booking.salon_name}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(85vh-200px)] pb-4">
          {/* Booking Summary */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{booking.service_name}</p>
                  <p className="text-sm text-muted-foreground">{booking.salon_name}</p>
                </div>
                <p className="text-lg font-semibold font-sans">₹{serviceAmount}</p>
              </div>
              
              {/* Show penalty if any */}
              {hasPenalties && (
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-border">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-amber-600">Cancellation Penalty</p>
                      <p className="text-xs text-muted-foreground">From previous cancelled bookings</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-amber-600 font-sans">+₹{totalPenalty}</p>
                </div>
              )}
              
              {/* Total */}
              {hasPenalties && (
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <p className="font-medium">Total</p>
                  <p className="text-xl font-bold text-primary font-sans">₹{totalAmount}</p>
                </div>
              )}
              
              {!hasPenalties && (
                <div className="flex justify-end">
                  <p className="text-xl font-bold text-primary font-sans">₹{totalAmount}</p>
                </div>
              )}
            </div>
          </div>

          {/* Wallet Balance Info */}
          {walletBalance > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
            >
              <Wallet className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Wallet Balance</p>
                <p className="text-xs text-muted-foreground">Available for payment</p>
              </div>
              <p className="font-semibold text-primary">₹{walletBalance}</p>
            </motion.div>
          )}

          {/* Payment Failure Banner */}
          <AnimatePresence>
            {paymentError && (
              <PaymentFailureBanner
                error={paymentError}
                onRetry={handlePayNow}
                onDismiss={() => setPaymentError(null)}
                isRetrying={isLoading}
                retryCount={retryCount}
                maxRetries={3}
              />
            )}
          </AnimatePresence>

          {/* Payment Method Selector */}
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onMethodChange={setPaymentMethod}
            totalAmount={totalAmount}
            walletBalance={walletBalance}
            walletAmountToUse={walletAmountToUse}
            onWalletAmountChange={setWalletAmountToUse}
          />
        </div>

        {/* Pay Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <Button
            onClick={handlePayNow}
            disabled={isLoading}
            className="w-full h-14 text-lg font-semibold gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : paymentMethod === 'salon' ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Confirm Booking
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pay ₹{amountToPay}
              </>
            )}
          </Button>
          
          {paymentMethod === 'salon' && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Pay ₹{totalAmount} at the salon when you arrive
            </p>
          )}
        </div>
      </SheetContent>

      {/* Payment Receipt Dialog */}
      {receiptData && (
        <PaymentReceipt
          open={showReceipt}
          onOpenChange={handleReceiptClose}
          receipt={receiptData}
        />
      )}
    </Sheet>
  );
}
