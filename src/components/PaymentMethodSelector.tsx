import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Smartphone, 
  Check, FlaskConical
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePaymentTestMode } from '@/hooks/usePaymentTestMode';

export type PaymentMethodType = 'upi' | 'salon';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodType;
  onMethodChange: (method: PaymentMethodType) => void;
  totalAmount: number;
  walletBalance: number;
  walletAmountToUse: number;
  onWalletAmountChange: (amount: number) => void;
}

const paymentMethods = [
  {
    id: 'upi' as PaymentMethodType,
    name: 'UPI',
    description: 'GPay, PhonePe, Paytm',
    icon: Smartphone,
    badge: 'Popular',
    badgeColor: 'primary',
  },
  {
    id: 'salon' as PaymentMethodType,
    name: 'Pay at Salon',
    description: 'Cash or Card',
    icon: MapPin,
    badge: null,
  },
];

export function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
}: PaymentMethodSelectorProps) {
  const { isTestMode, simulateSuccess, isLoading: testModeLoading } = usePaymentTestMode();

  const handleMethodSelect = (method: PaymentMethodType) => {
    onMethodChange(method);
  };

  // Show skeleton while loading
  if (testModeLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="relative flex flex-col items-center p-3 rounded-2xl border-2 border-border bg-card min-h-[80px] animate-pulse"
            >
              <div className="w-10 h-10 rounded-xl bg-muted/50" />
              <div className="w-12 h-3 mt-2 rounded bg-muted/50" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Test Mode Indicator */}
      {isTestMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30"
        >
          <FlaskConical className="w-5 h-5 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Test Mode Active
            </p>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
              Payments are simulated • {simulateSuccess ? 'Will succeed' : 'Will fail'}
            </p>
          </div>
          <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-[10px]">
            TEST
          </Badge>
        </motion.div>
      )}
      {/* Payment Methods Grid */}
      <div className="grid grid-cols-2 gap-3">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;

          return (
            <motion.button
              key={method.id}
              onClick={() => handleMethodSelect(method.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-200 min-h-[80px] ${
                isSelected
                  ? 'bg-primary/5 border-primary shadow-md shadow-primary/10'
                  : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
              }`}
            >
              {/* Badge */}
              {method.badge && (
                <div className={`absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase shadow-sm ${
                  method.badgeColor === 'primary' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                }`}>
                  {method.badge}
                </div>
              )}

              {/* Selection Indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm"
                >
                  <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                </motion.div>
              )}

              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                isSelected 
                  ? 'bg-primary/10' 
                  : 'bg-muted/50'
              }`}>
                <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>

              {/* Text Content */}
              <p className={`text-xs font-semibold mt-2 text-center leading-tight ${
                isSelected ? 'text-primary' : 'text-foreground'
              }`}>
                {method.name}
              </p>
            </motion.button>
          );
        })}
      </div>


      {/* UPI Info Message */}
      <AnimatePresence>
        {selectedMethod === 'upi' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground text-center">
                You'll be redirected to your UPI app to complete payment
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
