import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const WELCOME_BANNER_KEY = "glamour_welcome_banner_shown";

const WelcomeBanner = () => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (user) {
      const hasSeenBanner = localStorage.getItem(WELCOME_BANNER_KEY);
      if (!hasSeenBanner) {
        // Small delay to let the page load first
        const timer = setTimeout(() => setIsVisible(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(WELCOME_BANNER_KEY, "true");
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed top-20 left-4 right-4 z-50 md:left-1/2 md:-translate-x-1/2 md:max-w-lg"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-4 shadow-2xl">
            {/* Decorative elements */}
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className="absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
            
            {/* Sparkle animations */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute right-12 top-2"
            >
              <Sparkles className="h-4 w-4 text-yellow-300/60" />
            </motion.div>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="absolute left-8 bottom-2"
            >
              <Sparkles className="h-3 w-3 text-yellow-300/40" />
            </motion.div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute right-2 top-2 rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Content */}
            <div className="relative flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Gift className="h-6 w-6 text-white" />
              </div>
              
              <div className="flex-1 pr-6">
                <h3 className="text-lg font-bold text-white">
                  Welcome to Grumming! 🎉
                </h3>
                <p className="mt-1 text-sm text-white/90">
                  Use code <span className="font-bold text-yellow-300">FIRST100</span> for ₹100 off your first booking!
                </p>
                
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  className="mt-3 bg-white text-primary hover:bg-white/90"
                >
                  Got it, thanks!
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeBanner;
