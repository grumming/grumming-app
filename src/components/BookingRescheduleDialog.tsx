import { useState } from 'react';
import { format, addDays, parse, isBefore } from 'date-fns';
import { CalendarIcon, Loader2, RefreshCw, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Booking {
  id: string;
  salon_name: string;
  service_name: string;
  service_price: number;
  booking_date: string;
  booking_time: string;
  status: string;
}

interface BookingRescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking;
  userId: string;
  onRescheduleComplete: () => void;
}

const TIME_SLOTS = [
  '09:00:00', '09:30:00', '10:00:00', '10:30:00', '11:00:00', '11:30:00',
  '12:00:00', '12:30:00', '13:00:00', '13:30:00', '14:00:00', '14:30:00',
  '15:00:00', '15:30:00', '16:00:00', '16:30:00', '17:00:00', '17:30:00',
  '18:00:00', '18:30:00', '19:00:00', '19:30:00', '20:00:00', '20:30:00'
];

export function BookingRescheduleDialog({
  open,
  onOpenChange,
  booking,
  userId,
  onRescheduleComplete
}: BookingRescheduleDialogProps) {
  const { toast } = useToast();
  const [newDate, setNewDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [newTime, setNewTime] = useState<string>('10:00:00');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  const rescheduleFeePct = 10;
  const rescheduleAmount = Math.round(booking.service_price * (rescheduleFeePct / 100));

  const handleProceedToConfirm = () => {
    if (!newDate || !newTime) {
      toast({
        title: 'Select date & time',
        description: 'Please select a new date and time for your appointment.',
        variant: 'destructive'
      });
      return;
    }
    setStep('confirm');
  };

  const handleConfirmReschedule = async () => {
    if (!newDate || !newTime) return;

    setIsProcessing(true);

    try {
      const newDateStr = format(newDate, 'yyyy-MM-dd');

      // Fetch salon_id from salons table by name
      const { data: salonData } = await supabase
        .from('salons')
        .select('id')
        .eq('name', booking.salon_name)
        .single();

      // Create reschedule fee record
      const { data: feeRecord, error: feeError } = await supabase
        .from('reschedule_fees')
        .insert({
          booking_id: booking.id,
          user_id: userId,
          salon_id: salonData?.id || null,
          salon_name: booking.salon_name,
          original_date: booking.booking_date,
          original_time: booking.booking_time,
          new_date: newDateStr,
          new_time: newTime,
          service_price: booking.service_price,
          fee_amount: rescheduleAmount,
          fee_percentage: rescheduleFeePct,
          payment_method: 'wallet',
          status: 'completed',
          paid_at: new Date().toISOString()
        })
        .select()
        .single();

      if (feeError) throw feeError;

      // Deduct from wallet
      const { data: walletData, error: walletFetchError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', userId)
        .single();

      if (walletFetchError) {
        // If no wallet, still proceed with reschedule (fee logged but not deducted)
        console.warn('No wallet found for user, proceeding without deduction');
      } else if (walletData) {
        // Check if sufficient balance
        if (walletData.balance >= rescheduleAmount) {
          // Deduct from wallet
          await supabase
            .from('wallets')
            .update({
              balance: walletData.balance - rescheduleAmount,
              total_spent: walletData.balance + rescheduleAmount
            })
            .eq('id', walletData.id);

          // Record transaction
          await supabase
            .from('wallet_transactions')
            .insert({
              wallet_id: walletData.id,
              user_id: userId,
              amount: rescheduleAmount,
              type: 'debit',
              category: 'reschedule_fee',
              description: `Reschedule fee for ${booking.salon_name}`,
              reference_id: feeRecord?.id
            });
        }
      }

      // Update booking with new date/time
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          booking_date: newDateStr,
          booking_time: newTime
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      toast({
        title: 'Booking Rescheduled',
        description: `Your appointment has been moved to ${format(newDate, 'EEE, MMM d')} at ${format(parse(newTime, 'HH:mm:ss', new Date()), 'h:mm a')}. Reschedule fee: ₹${rescheduleAmount}`,
      });

      onRescheduleComplete();
      onOpenChange(false);
      setStep('select');
    } catch (error: any) {
      console.error('Reschedule error:', error);
      toast({
        title: 'Failed to reschedule',
        description: error.message || 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep('select');
    setNewDate(addDays(new Date(), 1));
    setNewTime('10:00:00');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Reschedule Booking
          </DialogTitle>
          <DialogDescription>
            {step === 'select' 
              ? 'Choose a new date and time for your appointment.'
              : 'Confirm your reschedule and pay the fee.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
              <p className="font-medium">{booking.service_name}</p>
              <p className="text-sm text-muted-foreground">{booking.salon_name}</p>
              <p className="text-sm text-muted-foreground">
                Current: {format(new Date(booking.booking_date), 'EEE, MMM d, yyyy')} at {booking.booking_time}
              </p>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  Reschedule Fee: <span className="font-sans">₹{rescheduleAmount}</span>
                </p>
                <p className="text-muted-foreground">
                  A {rescheduleFeePct}% fee will be charged for rescheduling.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>New Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !newDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newDate ? format(newDate, 'EEE, MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newDate}
                      onSelect={setNewDate}
                      disabled={(date) => isBefore(date, new Date())}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>New Time</Label>
                <Select value={newTime} onValueChange={setNewTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(time => (
                      <SelectItem key={time} value={time}>
                        {format(parse(time, 'HH:mm:ss', new Date()), 'h:mm a')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{booking.service_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Date</span>
                <span className="font-medium">{newDate ? format(newDate, 'EEE, MMM d, yyyy') : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Time</span>
                <span className="font-medium">{format(parse(newTime, 'HH:mm:ss', new Date()), 'h:mm a')}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold">Reschedule Fee</span>
                <span className="font-semibold text-primary font-sans">₹{rescheduleAmount}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              This fee will be deducted from your wallet. If insufficient balance, the reschedule will proceed but the fee will be recorded.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 'select' ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleProceedToConfirm}>
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button onClick={handleConfirmReschedule} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay ₹{rescheduleAmount} & Reschedule
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}