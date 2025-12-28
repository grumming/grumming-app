import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ExternalLink } from 'lucide-react';

interface UpiApp {
  id: string;
  name: string;
  color: string;
  scheme: string;
  package?: string;
}

const upiApps: UpiApp[] = [
  {
    id: 'gpay',
    name: 'GPay',
    color: 'bg-gradient-to-br from-blue-500 to-green-500',
    scheme: 'tez://upi/pay',
    package: 'com.google.android.apps.nbu.paisa.user',
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    color: 'bg-purple-600',
    scheme: 'phonepe://pay',
    package: 'com.phonepe.app',
  },
  {
    id: 'paytm',
    name: 'Paytm',
    color: 'bg-blue-500',
    scheme: 'paytmmp://pay',
    package: 'net.one97.paytm',
  },
  {
    id: 'cred',
    name: 'CRED',
    color: 'bg-gray-900',
    scheme: 'credpay://upi/pay',
    package: 'com.dreamplug.androidapp',
  },
  {
    id: 'amazonpay',
    name: 'Amazon',
    color: 'bg-orange-500',
    scheme: 'amazonpay://pay',
    package: 'in.amazon.mShop.android.shopping',
  },
  {
    id: 'bhim',
    name: 'BHIM',
    color: 'bg-green-600',
    scheme: 'upi://pay',
    package: 'in.org.npci.upiapp',
  },
];

interface UpiAppSelectorProps {
  amount: number;
  merchantVpa: string;
  merchantName: string;
  transactionNote: string;
  orderId: string;
  onPaymentInitiated: (appId: string) => void;
  selectedAppId: string | null;
  onAppSelect: (appId: string) => void;
}

export function UpiAppSelector({
  amount,
  merchantVpa,
  merchantName,
  transactionNote,
  orderId,
  onPaymentInitiated,
  selectedAppId,
  onAppSelect,
}: UpiAppSelectorProps) {
  const [isPaymentPending, setIsPaymentPending] = useState(false);

  const generateUpiLink = (app: UpiApp) => {
    const params = new URLSearchParams({
      pa: merchantVpa,
      pn: merchantName,
      am: amount.toString(),
      cu: 'INR',
      tn: transactionNote,
      tr: orderId,
    });

    // Use the app-specific scheme or fallback to generic UPI
    return `${app.scheme}?${params.toString()}`;
  };

  const handleAppClick = (app: UpiApp) => {
    onAppSelect(app.id);
  };

  const handlePayNow = () => {
    const selectedApp = upiApps.find(app => app.id === selectedAppId);
    if (!selectedApp) return;

    const upiLink = generateUpiLink(selectedApp);
    
    // Try to open the UPI app
    setIsPaymentPending(true);
    onPaymentInitiated(selectedApp.id);

    // Create a hidden link and trigger it
    const link = document.createElement('a');
    link.href = upiLink;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // Try opening via window.location for better mobile support
    window.location.href = upiLink;
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  };

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  if (!isMobile) {
    return (
      <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
        <p className="text-sm text-muted-foreground">
          UPI app payment is available on mobile devices only.
          <br />
          <span className="text-xs">Please use a mobile device to pay via UPI apps.</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Pay with UPI App</h4>
        <span className="text-xs text-muted-foreground">
          Select your preferred app
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {upiApps.map((app) => {
          const isSelected = selectedAppId === app.id;
          
          return (
            <motion.button
              key={app.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAppClick(app)}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-primary/10 border-primary ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
              }`}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                </motion.div>
              )}
              <div className={`w-8 h-8 rounded-lg ${app.color} flex items-center justify-center`}>
                <span className="text-white text-xs font-bold">
                  {app.name.charAt(0)}
                </span>
              </div>
              <span className={`text-xs font-medium text-center ${isSelected ? 'text-primary' : ''}`}>
                {app.name}
              </span>
            </motion.button>
          );
        })}
      </div>

      {selectedAppId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount to Pay</span>
              <span className="text-lg font-bold text-primary">₹{amount}</span>
            </div>
          </div>

          <button
            onClick={handlePayNow}
            disabled={isPaymentPending}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPaymentPending ? (
              'Opening app...'
            ) : (
              <>
                Pay with {upiApps.find(a => a.id === selectedAppId)?.name}
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-xs text-center text-muted-foreground">
            You'll be redirected to the app to complete payment
          </p>
        </motion.div>
      )}
    </div>
  );
}

// Simplified version for just showing app icons during selection
export function UpiAppIcons({ 
  selectedAppId, 
  onAppSelect 
}: { 
  selectedAppId: string | null; 
  onAppSelect: (appId: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Choose your UPI app:</p>
      <div className="flex flex-wrap gap-2">
        {upiApps.slice(0, 4).map((app) => {
          const isSelected = selectedAppId === app.id;
          
          return (
            <button
              key={app.id}
              onClick={() => onAppSelect(isSelected ? null : app.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-primary/10 border-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className={`w-6 h-6 rounded ${app.color} flex items-center justify-center`}>
                <span className="text-white text-[10px] font-bold">
                  {app.name.charAt(0)}
                </span>
              </div>
              <span className={`text-xs font-medium ${isSelected ? 'text-primary' : ''}`}>
                {app.name}
              </span>
              {isSelected && <Check className="w-3 h-3 text-primary" />}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onAppSelect(null)}
        className={`text-xs ${selectedAppId === null ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
      >
        {selectedAppId === null ? '✓ ' : ''}Any UPI app
      </button>
    </div>
  );
}
