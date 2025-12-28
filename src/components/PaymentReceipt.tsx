import { useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, Download, Share2, X, 
  Calendar, Clock, MapPin, Receipt, Copy 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PaymentReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: {
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
  };
}

export function PaymentReceipt({
  open,
  onOpenChange,
  receipt,
}: PaymentReceiptProps) {
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    try {
      // Create a canvas from the receipt content
      const receiptContent = generateReceiptText();
      const blob = new Blob([receiptContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `grumming-receipt-${receipt.bookingId.slice(0, 8)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Receipt Downloaded',
        description: 'Your payment receipt has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Could not download receipt. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    const receiptText = generateReceiptText();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Grumming Payment Receipt',
          text: receiptText,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          handleCopyToClipboard();
        }
      }
    } else {
      handleCopyToClipboard();
    }
  };

  const handleCopyToClipboard = async () => {
    const receiptText = generateReceiptText();
    try {
      await navigator.clipboard.writeText(receiptText);
      toast({
        title: 'Copied to Clipboard',
        description: 'Receipt details copied. You can paste and share it.',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy receipt. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const generateReceiptText = () => {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       GRUMMING PAYMENT RECEIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ PAYMENT SUCCESSFUL

Receipt No: ${receipt.bookingId.slice(0, 8).toUpperCase()}
Payment ID: ${receipt.paymentId}
Date: ${format(receipt.paidAt, 'dd MMM yyyy, hh:mm a')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Salon: ${receipt.salonName}
Service: ${receipt.serviceName}
${receipt.bookingDate ? `Appointment: ${receipt.bookingDate}` : ''}
${receipt.bookingTime ? `Time: ${receipt.bookingTime}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAYMENT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Service Amount:     ₹${receipt.amount}
${receipt.walletAmount && receipt.walletAmount > 0 ? `Wallet Used:        -₹${receipt.walletAmount}\n` : ''}Amount Paid:        ₹${receipt.paidAmount}
Payment Method:     ${receipt.paymentMethod}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for choosing Grumming!
For support: support@grumming.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto p-0 overflow-hidden">
        <div ref={receiptRef} className="bg-background">
          {/* Success Header */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle2 className="w-10 h-10" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-bold"
            >
              Payment Successful!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/80 text-sm mt-1"
            >
              {format(receipt.paidAt, 'dd MMM yyyy, hh:mm a')}
            </motion.p>
          </div>

          {/* Receipt Content */}
          <div className="p-6 space-y-6">
            {/* Amount */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <p className="text-sm text-muted-foreground">Amount Paid</p>
              <p className="text-4xl font-bold text-primary">₹{receipt.paidAmount}</p>
            </motion.div>

            {/* Receipt Details */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-4 p-4 rounded-xl bg-muted/50 border border-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{receipt.salonName}</p>
                  <p className="text-sm text-muted-foreground">{receipt.serviceName}</p>
                </div>
              </div>

              {receipt.bookingDate && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{receipt.bookingDate}</p>
                    {receipt.bookingTime && (
                      <p className="text-sm text-muted-foreground">{receipt.bookingTime}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Receipt #{receipt.bookingId.slice(0, 8).toUpperCase()}</p>
                  <p className="text-sm text-muted-foreground">{receipt.paymentMethod}</p>
                </div>
              </div>
            </motion.div>

            {/* Payment Breakdown */}
            {receipt.walletAmount && receipt.walletAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-2 text-sm"
              >
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Amount</span>
                  <span>₹{receipt.amount}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Wallet Used</span>
                  <span>-₹{receipt.walletAmount}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t border-border">
                  <span>Amount Paid</span>
                  <span>₹{receipt.paidAmount}</span>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex gap-3"
            >
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </motion.div>

            {/* Copy Receipt ID */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={() => {
                navigator.clipboard.writeText(receipt.paymentId);
                toast({
                  title: 'Copied!',
                  description: 'Payment ID copied to clipboard.',
                });
              }}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy className="w-3 h-3" />
              <span>Copy Payment ID: {receipt.paymentId}</span>
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
