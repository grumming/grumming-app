import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, Smartphone, Check, Plus, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SavedPaymentMethod {
  id: string;
  type: 'card' | 'upi';
  card_last4: string | null;
  card_brand: string | null;
  upi_id: string | null;
  label: string | null;
  is_default: boolean;
}

interface SavedPaymentMethodPickerProps {
  paymentType: 'card' | 'upi';
  selectedMethodId: string | null;
  onMethodSelect: (methodId: string | null) => void;
}

export function SavedPaymentMethodPicker({
  paymentType,
  selectedMethodId,
  onMethodSelect,
}: SavedPaymentMethodPickerProps) {
  const { user } = useAuth();
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchMethods = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('payment_methods')
        .select('id, type, card_last4, card_brand, upi_id, label, is_default')
        .eq('user_id', user.id)
        .eq('type', paymentType)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMethods(data as SavedPaymentMethod[]);
        // Auto-select default method
        const defaultMethod = data.find(m => m.is_default);
        if (defaultMethod && !selectedMethodId) {
          onMethodSelect(defaultMethod.id);
        }
      }
      setIsLoading(false);
    };

    fetchMethods();
  }, [user, paymentType]);

  if (isLoading) {
    return (
      <div className="animate-pulse h-12 bg-muted rounded-lg" />
    );
  }

  if (methods.length === 0) {
    return null;
  }

  const selectedMethod = methods.find(m => m.id === selectedMethodId);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {paymentType === 'card' ? (
            <CreditCard className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Smartphone className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm">
            {selectedMethod ? (
              paymentType === 'card' 
                ? `${selectedMethod.card_brand} •••• ${selectedMethod.card_last4}`
                : selectedMethod.upi_id
            ) : (
              `Select saved ${paymentType === 'card' ? 'card' : 'UPI'}`
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedMethod && (
            <Check className="w-4 h-4 text-primary" />
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-1 pt-1">
              {methods.map((method) => {
                const isSelected = selectedMethodId === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => {
                      onMethodSelect(method.id);
                      setIsExpanded(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-muted/50 hover:bg-muted border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-primary/20' : 'bg-background'
                      }`}>
                        {paymentType === 'card' ? (
                          <CreditCard className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        ) : (
                          <Smartphone className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        )}
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>
                          {paymentType === 'card' 
                            ? `${method.card_brand} •••• ${method.card_last4}`
                            : method.upi_id
                          }
                        </p>
                        {method.label && (
                          <p className="text-xs text-muted-foreground">{method.label}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {method.is_default && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          Default
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Use new method option */}
              <button
                onClick={() => {
                  onMethodSelect(null);
                  setIsExpanded(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  selectedMethodId === null
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-muted/50 hover:bg-muted border border-transparent'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  selectedMethodId === null ? 'bg-primary/20' : 'bg-background'
                }`}>
                  <Plus className={`w-4 h-4 ${selectedMethodId === null ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <span className={`text-sm ${selectedMethodId === null ? 'text-primary font-medium' : ''}`}>
                  Use new {paymentType === 'card' ? 'card' : 'UPI ID'}
                </span>
                {selectedMethodId === null && (
                  <Check className="w-4 h-4 text-primary ml-auto" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
