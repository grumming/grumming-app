import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, Wallet, MapPin, Smartphone, 
  SplitSquareVertical, Check, Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

export type PaymentMethodType = 'online' | 'upi' | 'salon' | 'split';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodType;
  onMethodChange: (method: PaymentMethodType) => void;
  totalAmount: number;
  walletBalance: number;
  walletAmountToUse: number;
  onWalletAmountChange: (amount: number) => void;
  isSplitPayment: boolean;
  onSplitToggle: (enabled: boolean) => void;
}

const paymentMethods = [
  {
    id: 'online' as PaymentMethodType,
    name: 'Pay Online',
    description: 'Cards, Net Banking',
    icon: CreditCard,
    badge: null,
  },
  {
    id: 'upi' as PaymentMethodType,
    name: 'UPI',
    description: 'GPay, PhonePe, Paytm',
    icon: Smartphone,
    badge: 'Popular',
  },
  {
    id: 'salon' as PaymentMethodType,
    name: 'Pay at Salon',
    description: 'Cash or Card',
    icon: MapPin,
    badge: null,
  },
  {
    id: 'split' as PaymentMethodType,
    name: 'Split Payment',
    description: 'Wallet + Other',
    icon: SplitSquareVertical,
    badge: 'New',
  },
];

export function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  totalAmount,
  walletBalance,
  walletAmountToUse,
  onWalletAmountChange,
  isSplitPayment,
  onSplitToggle,
}: PaymentMethodSelectorProps) {
  const maxWalletUsable = Math.min(walletBalance, totalAmount - 1); // Leave at least ₹1 for other payment
  const remainingAmount = totalAmount - walletAmountToUse;

  const handleMethodSelect = (method: PaymentMethodType) => {
    onMethodChange(method);
    if (method === 'split') {
      onSplitToggle(true);
      // Set initial wallet amount to use
      if (walletBalance > 0) {
        onWalletAmountChange(Math.min(walletBalance, Math.floor(totalAmount / 2)));
      }
    } else {
      onSplitToggle(false);
      onWalletAmountChange(0);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">Payment Method</h4>
      
      <div className="grid grid-cols-2 gap-3">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          const isDisabled = method.id === 'split' && walletBalance <= 0;

          return (
            <button
              key={method.id}
              onClick={() => !isDisabled && handleMethodSelect(method.id)}
              disabled={isDisabled}
              className={`relative flex items-center gap-3 p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-primary/10 border-primary ring-1 ring-primary/20'
                  : isDisabled
                  ? 'border-border opacity-50 cursor-not-allowed'
                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-primary-foreground" />
                </motion.div>
              )}

              {/* Badge */}
              {method.badge && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground"
                >
                  {method.badge}
                </Badge>
              )}

              <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-left flex-1">
                <p className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>
                  {method.name}
                </p>
                <p className="text-xs text-muted-foreground">{method.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Split Payment Configuration */}
      <AnimatePresence>
        {selectedMethod === 'split' && walletBalance > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/10 border border-primary/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Use Wallet Balance</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Available: ₹{walletBalance}
                </span>
              </div>

              <div className="space-y-2">
                <Slider
                  value={[walletAmountToUse]}
                  onValueChange={(value) => onWalletAmountChange(value[0])}
                  max={maxWalletUsable}
                  min={0}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>₹0</span>
                  <span>₹{maxWalletUsable}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">From Wallet</p>
                  <p className="text-lg font-semibold text-primary">₹{walletAmountToUse}</p>
                </div>
                <div className="text-center px-4">
                  <span className="text-muted-foreground">+</span>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs text-muted-foreground">Pay at Salon</p>
                  <p className="text-lg font-semibold">₹{remainingAmount}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-900/10">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  ₹{walletAmountToUse} will be deducted from wallet now. Pay ₹{remainingAmount} at the salon.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPI Apps Info */}
      <AnimatePresence>
        {selectedMethod === 'upi' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-lg bg-accent/50 border border-border">
              <p className="text-xs text-muted-foreground text-center">
                You'll be redirected to your UPI app to complete the payment
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
