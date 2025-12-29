import { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const WELCOME_BANNER_KEY = "glamour_welcome_banner_shown";

const WelcomeBannerContent = forwardRef<HTMLDivElement, { onDismiss: () => void }>(
  ({ onDismiss }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 p-4 shadow-2xl">
          {/* Decorative elements */}
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/20 blur-xl" />
          <div className="absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-fuchsia-300/20 blur-xl" />
          
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
            onClick={onDismiss}
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
                onClick={onDismiss}
                size="sm"
                className="mt-3 bg-white text-primary hover:bg-white/90"
              >
                Got it, thanks!
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
);

WelcomeBannerContent.displayName = "WelcomeBannerContent";

const WelcomeBanner = () => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  // Check if user has any bookings
  const { data: hasBookings, isLoading } = useQuery({
    queryKey: ['user-has-bookings-welcome', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { count, error } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) return false;
      return (count || 0) > 0;
    },
    enabled: !!user,
    staleTime: 60000,
  });

  useEffect(() => {
    // Only show if: user exists, not loading, has no bookings, and hasn't seen banner
    if (user && !isLoading && !hasBookings) {
      const hasSeenBanner = localStorage.getItem(WELCOME_BANNER_KEY);
      if (!hasSeenBanner) {
        // Small delay to let the page load first
        const timer = setTimeout(() => setIsVisible(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, isLoading, hasBookings]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(WELCOME_BANNER_KEY, "true");
  };

  // Don't show if not logged in, loading, or user has bookings
  if (!user || isLoading || hasBookings) return null;

  return (
    <AnimatePresence>
      {isVisible && <WelcomeBannerContent onDismiss={handleDismiss} />}
    </AnimatePresence>
  );
};

export default WelcomeBanner;
