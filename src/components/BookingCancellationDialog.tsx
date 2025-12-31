import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CreditCard, Loader2, AlertTriangle, Clock, Zap } from 'lucide-react';
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
import { format, parseISO } from 'date-fns';

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
  const [step, setStep] = useState<'choose' | 'confirm'>('choose');

  const refundAmount = booking.service_price;

  const handleCancel = async () => {
    setIsProcessing(true);

    try {
      if (refundOption === 'wallet') {
        // Instant refund to wallet
        await addCredits({
          amount: refundAmount,
          category: 'refund',
          description: `Refund for cancelled booking at ${booking.salon_name}`,
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
          description: `₹${refundAmount} has been instantly credited to your wallet.`,
        });
      } else {
        // Refund to original payment method via Razorpay
        const { data: refundResult, error: refundError } = await supabase.functions.invoke(
          'process-razorpay-refund',
          {
            body: {
              booking_id: booking.id,
              refund_amount: refundAmount,
            },
          }
        );

        if (refundError) throw refundError;
        if (!refundResult?.success) throw new Error(refundResult?.error || 'Refund failed');

        toast({
          title: 'Booking Cancelled',
          description: `₹${refundAmount} will be refunded to your original payment method within 5-7 business days.`,
        });
      }

      onCancellationComplete();
      onOpenChange(false);
      setStep('choose');
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
      setStep('choose');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
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
          {step === 'choose' ? (
            <motion.div
              key="choose"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4 py-4"
            >
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">Refund Amount</p>
                <p className="text-2xl font-bold text-primary">₹{refundAmount}</p>
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
                        Get ₹{refundAmount} instantly in your Grumming wallet for future bookings.
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
                        Refund to your original payment method. Takes 5-7 business days.
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
                    {refundOption === 'wallet' ? (
                      <>₹{refundAmount} will be <span className="text-green-600 font-medium">instantly credited</span> to your wallet.</>
                    ) : (
                      <>₹{refundAmount} will be refunded to your original payment method within <span className="font-medium">5-7 business days</span>.</>
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step === 'choose' ? (
            <>
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Keep Booking
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
                onClick={() => setStep('choose')} 
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
