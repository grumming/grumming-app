import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, X, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentError {
  code?: string;
  reason?: string;
  description?: string;
  source?: string;
  step?: string;
  metadata?: Record<string, any>;
  isRetryable?: boolean;
}

interface PaymentFailureBannerProps {
  error: PaymentError;
  onRetry: () => void;
  onDismiss: () => void;
  onPayAtSalon?: () => void;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
  totalAmount?: number;
}

export function PaymentFailureBanner({
  error,
  onRetry,
  onDismiss,
  onPayAtSalon,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
  totalAmount,
}: PaymentFailureBannerProps) {
  const errorCode = error.code || 'UNKNOWN';
  const errorReason = error.reason || error.description || 'Payment could not be completed';
  
  // Check if this is an app handoff failure (common on iOS)
  const isAppHandoffFailure = 
    errorCode === 'BAD_REQUEST_ERROR' ||
    errorReason.toLowerCase().includes('app') ||
    errorReason.toLowerCase().includes('handoff') ||
    errorReason.toLowerCase().includes('intent') ||
    error.source === 'customer' && error.step === 'payment_authorization';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-destructive/20">
          <AlertCircle className="w-5 h-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-destructive">Payment Failed</h4>
            <button
              onClick={onDismiss}
              className="p-1 rounded-full hover:bg-destructive/20 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <p className="text-sm text-foreground/80 mt-1">{errorReason}</p>
          
          {/* Error details */}
          <div className="mt-2 p-2 rounded-lg bg-background/50 border border-border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Error Code:</span>
              <code className="font-mono text-destructive">{errorCode}</code>
            </div>
            {error.source && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source:</span>
                <span className="text-foreground/70">{error.source}</span>
              </div>
            )}
            {error.step && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Step:</span>
                <span className="text-foreground/70">{error.step}</span>
              </div>
            )}
          </div>

          {/* Helpful suggestion for app handoff failures */}
          {isAppHandoffFailure && (
            <p className="text-xs text-muted-foreground mt-2">
              💡 Tip: Try using UPI ID (VPA) instead of the UPI app for more reliable payments.
            </p>
          )}
          
          {/* Show auto-retry info */}
          {retryCount > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              ⚡ Auto-retried {retryCount} time{retryCount > 1 ? 's' : ''} before giving up.
            </p>
          )}
          
          {/* Show if error is retryable */}
          {error.isRetryable && retryCount < maxRetries && (
            <p className="text-xs text-primary mt-2">
              🔄 This error may be temporary. A retry might succeed.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={onRetry}
          disabled={isRetrying}
          variant="destructive"
          size="sm"
          className="w-full gap-2"
        >
          {isRetrying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Try Again
            </>
          )}
        </Button>
        
        {/* Pay at Salon Fallback */}
        {onPayAtSalon && (
          <Button
            onClick={onPayAtSalon}
            variant="outline"
            size="sm"
            className="w-full gap-2 border-primary/30 hover:bg-primary/10"
          >
            <Store className="w-4 h-4" />
            Pay ₹{totalAmount || 0} at Salon Instead
          </Button>
        )}
      </div>
      
      {onPayAtSalon && (
        <p className="text-xs text-muted-foreground text-center">
          Your booking will be confirmed. Pay when you arrive.
        </p>
      )}
    </motion.div>
  );
}
