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

export type PaymentMethodType = 'online' | 'upi' | 'salon';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodType;
  onMethodChange: (method: PaymentMethodType) => void;
  totalAmount: number;
  walletBalance: number;
  walletAmountToUse: number;
  onWalletAmountChange: (amount: number) => void;
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
];

export function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  totalAmount,
  walletBalance,
  walletAmountToUse,
  onWalletAmountChange,
  selectedSavedMethodId,
  onSavedMethodSelect,
  selectedUpiAppId,
  onUpiAppSelect,
}: PaymentMethodSelectorProps) {
  const maxWalletUsable = Math.min(walletBalance, totalAmount);

  const handleMethodSelect = (method: PaymentMethodType) => {
    onMethodChange(method);
  };

  return (
    <div className="space-y-5">
      {/* Wallet Balance Section */}
      {walletBalance > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 via-background to-accent/5 border border-primary/10 shadow-sm"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Use Wallet Balance</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-xs font-semibold text-primary">
                ₹{walletBalance.toFixed(2)} available
              </span>
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-2 mb-1">
            <div className="relative">
              <Slider
                value={[walletAmountToUse]}
                onValueChange={(value) => onWalletAmountChange(value[0])}
                max={maxWalletUsable}
                min={0}
                step={1}
                className="w-full [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary [&_[role=slider]]:bg-background [&_[role=slider]]:shadow-md [&_.relative]:h-2 [&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-primary/80 [&_.bg-primary]:to-primary"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>₹0</span>
              <span>₹{maxWalletUsable}</span>
            </div>
          </div>

          {/* Deduction Breakdown - Always visible */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 pt-3 border-t border-border/30 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Wallet deduction</span>
              <span className={`text-sm font-bold ${walletAmountToUse > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                {walletAmountToUse > 0 ? `-₹${walletAmountToUse}` : '₹0'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Remaining to pay</span>
              <span className="text-sm font-bold text-foreground">
                ₹{totalAmount - walletAmountToUse}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Payment Methods Grid */}
      <div className="grid grid-cols-3 gap-3">
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

    </div>
  );
}
