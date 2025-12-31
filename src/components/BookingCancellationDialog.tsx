import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CreditCard, Loader2, AlertTriangle, Clock, Zap, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';

interface BookingCancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    salon_name: string;
    service_name: string;
    service_price: number;
    booking_date: string;
    booking_time: string;
    status: string;
  };
  onCancellationComplete: () => void;
}

type RefundOption = 'wallet' | 'original';

interface CancellationPolicy {
  hoursBeforeBooking: number;
  refundPercentage: number;
  label: string;
}

const CANCELLATION_POLICIES: CancellationPolicy[] = [
  { hoursBeforeBooking: 24, refundPercentage: 80, label: '24+ hours before' },
  { hoursBeforeBooking: 12, refundPercentage: 50, label: '12-24 hours before' },
  { hoursBeforeBooking: 6, refundPercentage: 30, label: '6-12 hours before' },
  { hoursBeforeBooking: 1, refundPercentage: 10, label: '1-6 hours before' },
  { hoursBeforeBooking: 0, refundPercentage: 0, label: 'Less than 1 hour' },
];

function getBookingDateTime(bookingDate: string, bookingTime: string): Date {
  // Parse booking date and time
  const date = parseISO(bookingDate);
  const [hours, minutes] = bookingTime.split(':').map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function calculateRefund(bookingDate: string, bookingTime: string, originalAmount: number) {
  const bookingDateTime = getBookingDateTime(bookingDate, bookingTime);
  const now = new Date();
  const hoursUntilBooking = differenceInHours(bookingDateTime, now);
  const minutesUntilBooking = differenceInMinutes(bookingDateTime, now);

  // If booking is in the past, no refund
  if (minutesUntilBooking < 0) {
    return {
      percentage: 0,
      amount: 0,
      deduction: originalAmount,
      policy: CANCELLATION_POLICIES[4],
      hoursRemaining: 0,
      isPastBooking: true,
    };
  }

  // Find the applicable policy
  let applicablePolicy = CANCELLATION_POLICIES[4]; // Default to 0%
  
  if (hoursUntilBooking >= 24) {
    applicablePolicy = CANCELLATION_POLICIES[0];
  } else if (hoursUntilBooking >= 12) {
    applicablePolicy = CANCELLATION_POLICIES[1];
  } else if (hoursUntilBooking >= 6) {
    applicablePolicy = CANCELLATION_POLICIES[2];
  } else if (hoursUntilBooking >= 1) {
    applicablePolicy = CANCELLATION_POLICIES[3];
  }

  const refundAmount = Math.round((originalAmount * applicablePolicy.refundPercentage) / 100);
  const deductionAmount = originalAmount - refundAmount;

  return {
    percentage: applicablePolicy.refundPercentage,
    amount: refundAmount,
    deduction: deductionAmount,
    policy: applicablePolicy,
    hoursRemaining: hoursUntilBooking,
    isPastBooking: false,
  };
}

export function BookingCancellationDialog({
  open,
  onOpenChange,
  booking,
  onCancellationComplete,
}: BookingCancellationDialogProps) {
  const { toast } = useToast();
  const { addCredits } = useWallet();
  const [refundOption, setRefundOption] = useState<RefundOption>('wallet');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'policy' | 'choose' | 'confirm'>('policy');

  const refundInfo = useMemo(() => 
    calculateRefund(booking.booking_date, booking.booking_time, booking.service_price),
    [booking.booking_date, booking.booking_time, booking.service_price]
  );

  const handleCancel = async () => {
    setIsProcessing(true);

    try {
      if (refundInfo.amount === 0) {
        // No refund, just cancel
        const { error } = await supabase
          .from('bookings')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        if (error) throw error;

        toast({
          title: 'Booking Cancelled',
          description: 'No refund applicable due to late cancellation.',
        });
      } else if (refundOption === 'wallet') {
        // Instant refund to wallet
        await addCredits({
          amount: refundInfo.amount,
          category: 'refund',
          description: `${refundInfo.percentage}% refund for cancelled booking at ${booking.salon_name}`,
          referenceId: booking.id,
        });

        // Update booking status
        const { error } = await supabase
          .from('bookings')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        if (error) throw error;

        toast({
          title: 'Booking Cancelled',
          description: `₹${refundInfo.amount} (${refundInfo.percentage}% refund) has been credited to your wallet.`,
        });
      } else {
        // Refund to original payment method via Razorpay
        const { data: refundResult, error: refundError } = await supabase.functions.invoke(
          'process-razorpay-refund',
          {
            body: {
              booking_id: booking.id,
              refund_amount: refundInfo.amount,
            },
          }
        );

        if (refundError) throw refundError;
        if (!refundResult?.success) throw new Error(refundResult?.error || 'Refund failed');

        toast({
          title: 'Booking Cancelled',
          description: `₹${refundInfo.amount} (${refundInfo.percentage}% refund) will be refunded within 5-7 business days.`,
        });
      }

      onCancellationComplete();
      onOpenChange(false);
      setStep('policy');
    } catch (error: any) {
      toast({
        title: 'Cancellation Failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setStep('policy');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Cancel Booking
          </DialogTitle>
          <DialogDescription>
            {booking.service_name} at {booking.salon_name}
            <br />
            <span className="font-medium">
              {format(parseISO(booking.booking_date), 'EEE, MMM d')} at {booking.booking_time}
            </span>
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'policy' ? (
            <motion.div
              key="policy"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4 py-4"
            >
              {/* Cancellation Policy */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Info className="w-4 h-4 text-primary" />
                  Cancellation Policy
                </div>
                <div className="space-y-2">
                  {CANCELLATION_POLICIES.map((policy, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${
                        refundInfo.policy.hoursBeforeBooking === policy.hoursBeforeBooking
                          ? 'bg-primary/10 border-2 border-primary'
                          : 'bg-muted/50'
                      }`}
                    >
                      <span className={refundInfo.policy.hoursBeforeBooking === policy.hoursBeforeBooking ? 'font-medium' : 'text-muted-foreground'}>
                        {policy.label}
                      </span>
                      <span className={`font-semibold ${
                        policy.refundPercentage >= 50 ? 'text-green-600' : 
                        policy.refundPercentage > 0 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {policy.refundPercentage}% refund
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Your Refund */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Time until booking</span>
                  <span className="font-semibold">
                    {refundInfo.isPastBooking ? (
                      <span className="text-red-600">Past booking</span>
                    ) : refundInfo.hoursRemaining >= 24 ? (
                      `${Math.floor(refundInfo.hoursRemaining / 24)}d ${refundInfo.hoursRemaining % 24}h`
                    ) : (
                      `${refundInfo.hoursRemaining}h remaining`
                    )}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Original Amount</span>
                    <span>₹{booking.service_price}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cancellation Fee ({100 - refundInfo.percentage}%)</span>
                    <span className="text-red-600">-₹{refundInfo.deduction}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex items-center justify-between">
                    <span className="font-medium">Your Refund ({refundInfo.percentage}%)</span>
                    <span className={`text-xl font-bold ${refundInfo.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{refundInfo.amount}
                    </span>
                  </div>
                </div>
              </div>

              {refundInfo.amount === 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Cancellations less than 1 hour before the booking are not eligible for refunds.
                  </p>
                </div>
              )}
            </motion.div>
          ) : step === 'choose' ? (
            <motion.div
              key="choose"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4 py-4"
            >
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">Refund Amount ({refundInfo.percentage}%)</p>
                <p className="text-2xl font-bold text-primary">₹{refundInfo.amount}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Choose refund method:</p>
                <RadioGroup
                  value={refundOption}
                  onValueChange={(value) => setRefundOption(value as RefundOption)}
                  className="space-y-3"
                >
                  <div 
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      refundOption === 'wallet' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                    onClick={() => setRefundOption('wallet')}
                  >
                    <RadioGroupItem value="wallet" id="wallet" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="wallet" className="flex items-center gap-2 cursor-pointer font-medium">
                        <Wallet className="w-4 h-4 text-primary" />
                        Refund to Wallet
                        <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-semibold">
                          <Zap className="w-3 h-3" />
                          Instant
                        </span>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get ₹{refundInfo.amount} instantly in your Grumming wallet.
                      </p>
                    </div>
                  </div>

                  <div 
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      refundOption === 'original' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                    onClick={() => setRefundOption('original')}
                  >
                    <RadioGroupItem value="original" id="original" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="original" className="flex items-center gap-2 cursor-pointer font-medium">
                        <CreditCard className="w-4 h-4 text-primary" />
                        Original Payment Method
                        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          5-7 days
                        </span>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Refund to your original payment method.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="py-4"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold">Confirm Cancellation</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {refundInfo.amount === 0 ? (
                      <>Your booking will be cancelled with <span className="text-red-600 font-medium">no refund</span>.</>
                    ) : refundOption === 'wallet' ? (
                      <>₹{refundInfo.amount} ({refundInfo.percentage}% refund) will be <span className="text-green-600 font-medium">instantly credited</span> to your wallet.</>
                    ) : (
                      <>₹{refundInfo.amount} ({refundInfo.percentage}% refund) will be refunded within <span className="font-medium">5-7 business days</span>.</>
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step === 'policy' ? (
            <>
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Keep Booking
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setStep(refundInfo.amount > 0 ? 'choose' : 'confirm')}
                className="flex-1"
              >
                {refundInfo.amount > 0 ? 'Continue' : 'Cancel Anyway'}
              </Button>
            </>
          ) : step === 'choose' ? (
            <>
              <Button variant="outline" onClick={() => setStep('policy')} className="flex-1">
                Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setStep('confirm')}
                className="flex-1"
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setStep(refundInfo.amount > 0 ? 'choose' : 'policy')} 
                disabled={isProcessing}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCancel}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Cancel Booking'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
