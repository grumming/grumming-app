import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Loader2, Wallet, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PaymentMethodSelector, PaymentMethodType } from './PaymentMethodSelector';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';

interface BookingPaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    salon_name: string;
    service_name: string;
    service_price: number;
  };
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onPaymentSuccess: () => void;
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
  const { initiatePayment, isLoading: razorpayLoading } = useRazorpay();
  const { wallet, useCredits } = useWallet();
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('upi');
  const [walletAmountToUse, setWalletAmountToUse] = useState(0);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [selectedSavedMethodId, setSelectedSavedMethodId] = useState<string | null>(null);
  const [selectedUpiAppId, setSelectedUpiAppId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const walletBalance = wallet?.balance || 0;
  const totalAmount = booking.service_price;
  const amountToPay = isSplitPayment ? totalAmount - walletAmountToUse : totalAmount;

  const handlePayNow = async () => {
    setIsProcessing(true);

    try {
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

      // Handle online/UPI payment
      if (paymentMethod === 'online' || paymentMethod === 'upi') {
        const result = await initiatePayment({
          amount: amountToPay,
          bookingId: booking.id,
          salonName: booking.salon_name,
          serviceName: booking.service_name,
          customerName,
          customerEmail,
          customerPhone,
        });

        if (result.success) {
          toast({
            title: 'Payment Successful!',
            description: `Your booking at ${booking.salon_name} has been paid.`,
          });
          onPaymentSuccess();
          onOpenChange(false);
        } else {
          // If split payment and wallet was deducted, we need to inform user
          if (isSplitPayment && walletAmountToUse > 0) {
            toast({
              title: 'Payment Failed',
              description: 'Online payment failed. Wallet amount was deducted - please contact support.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Payment Failed',
              description: result.error || 'Please try again.',
              variant: 'destructive',
            });
          }
        }
      } else if (paymentMethod === 'split' && amountToPay > 0) {
        // For split payment with remaining amount to pay at salon
        toast({
          title: 'Wallet Amount Deducted',
          description: `₹${walletAmountToUse} deducted from wallet. Pay ₹${amountToPay} at the salon.`,
        });
        onPaymentSuccess();
        onOpenChange(false);
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
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{booking.service_name}</p>
                <p className="text-sm text-muted-foreground">{booking.salon_name}</p>
              </div>
              <p className="text-xl font-bold text-primary">₹{totalAmount}</p>
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

          {/* Payment Method Selector */}
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onMethodChange={setPaymentMethod}
            totalAmount={totalAmount}
            walletBalance={walletBalance}
            walletAmountToUse={walletAmountToUse}
            onWalletAmountChange={setWalletAmountToUse}
            isSplitPayment={isSplitPayment}
            onSplitToggle={setIsSplitPayment}
            selectedSavedMethodId={selectedSavedMethodId}
            onSavedMethodSelect={setSelectedSavedMethodId}
            selectedUpiAppId={selectedUpiAppId}
            onUpiAppSelect={setSelectedUpiAppId}
          />
        </div>

        {/* Pay Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <Button
            onClick={handlePayNow}
            disabled={isLoading || (paymentMethod === 'salon')}
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
                Pay at Salon
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
              No advance payment needed - pay at the salon
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
