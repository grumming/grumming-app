import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, Wallet, MapPin, Smartphone, 
  SplitSquareVertical, Check, Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { SavedPaymentMethodPicker } from './SavedPaymentMethodPicker';
import { UpiAppIcons } from './UpiAppSelector';

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
  selectedSavedMethodId?: string | null;
  onSavedMethodSelect?: (methodId: string | null) => void;
  selectedUpiAppId?: string | null;
  onUpiAppSelect?: (appId: string | null) => void;
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
    badgeColor: 'primary',
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
    badgeColor: 'secondary',
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
  selectedSavedMethodId,
  onSavedMethodSelect,
  selectedUpiAppId,
  onUpiAppSelect,
}: PaymentMethodSelectorProps) {
  const maxWalletUsable = Math.min(walletBalance, totalAmount - 1);
  const remainingAmount = totalAmount - walletAmountToUse;

  const handleMethodSelect = (method: PaymentMethodType) => {
    onMethodChange(method);
    if (method === 'split') {
      onSplitToggle(true);
      if (walletBalance > 0) {
        onWalletAmountChange(Math.min(walletBalance, Math.floor(totalAmount / 2)));
      }
    } else {
      onSplitToggle(false);
      onWalletAmountChange(0);
    }
  };

  return (
    <div className="space-y-5">
      {/* Payment Methods Grid */}
      <div className="grid grid-cols-2 gap-3">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          const isDisabled = method.id === 'split' && walletBalance <= 0;

          return (
            <motion.button
              key={method.id}
              onClick={() => !isDisabled && handleMethodSelect(method.id)}
              disabled={isDisabled}
              whileHover={!isDisabled ? { scale: 1.02 } : undefined}
              whileTap={!isDisabled ? { scale: 0.98 } : undefined}
              className={`relative flex flex-col p-4 rounded-2xl border-2 transition-all duration-200 min-h-[90px] ${
                isSelected
                  ? 'bg-primary/5 border-primary shadow-md shadow-primary/10'
                  : isDisabled
                  ? 'border-border/50 opacity-50 cursor-not-allowed bg-muted/30'
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

              {/* Selection Checkbox */}
              <div className={`absolute top-3 left-3 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                isSelected 
                  ? 'bg-primary border-primary' 
                  : 'border-muted-foreground/30 bg-background'
              }`}>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                  </motion.div>
                )}
              </div>

              {/* Icon */}
              <div className="ml-auto">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isSelected 
                    ? 'bg-primary/10' 
                    : 'bg-muted/50'
                }`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
              </div>

              {/* Text Content */}
              <div className="mt-auto text-left">
                <p className={`text-sm font-semibold leading-tight ${
                  isSelected ? 'text-primary' : 'text-foreground'
                }`}>
                  {method.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {method.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Saved Card Selection for Online Payment */}
      <AnimatePresence>
        {selectedMethod === 'online' && onSavedMethodSelect && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
              <p className="text-sm font-medium text-foreground">Your saved cards</p>
              <SavedPaymentMethodPicker
                paymentType="card"
                selectedMethodId={selectedSavedMethodId || null}
                onMethodSelect={onSavedMethodSelect}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved UPI Selection */}
      <AnimatePresence>
        {selectedMethod === 'upi' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-4">
              {/* Saved UPI IDs */}
              {onSavedMethodSelect && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Your saved UPI IDs</p>
                  <SavedPaymentMethodPicker
                    paymentType="upi"
                    selectedMethodId={selectedSavedMethodId || null}
                    onMethodSelect={onSavedMethodSelect}
                  />
                </div>
              )}

              {/* UPI App Selection */}
              {onUpiAppSelect && (
                <div className="pt-3 border-t border-border/50">
                  <p className="text-sm font-medium text-foreground mb-3">Choose your UPI app:</p>
                  <UpiAppIcons
                    selectedAppId={selectedUpiAppId || null}
                    onAppSelect={onUpiAppSelect}
                  />
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center pt-2">
                You'll be redirected to your selected UPI app to complete payment
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split Payment Configuration */}
      <AnimatePresence>
        {selectedMethod === 'split' && walletBalance > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 via-background to-accent/5 border border-primary/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Use Wallet Balance</span>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                  ₹{walletBalance} available
                </span>
              </div>

              <div className="space-y-3">
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

              <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border">
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">From Wallet</p>
                  <p className="text-xl font-bold text-primary">₹{walletAmountToUse}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground font-medium">+</span>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pay at Salon</p>
                  <p className="text-xl font-bold text-foreground">₹{remainingAmount}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  ₹{walletAmountToUse} will be deducted from wallet now. Pay ₹{remainingAmount} at the salon.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
