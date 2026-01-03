import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { usePendingPenalties } from "@/hooks/usePendingPenalties";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

const PenaltyWarningBanner = () => {
  const { user } = useAuth();
  const { hasPenalties, totalPenalty, loading } = usePendingPenalties();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if not logged in, loading, no penalties, or dismissed
  if (!user || loading || !hasPenalties || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mx-4 mt-4"
      >
        <div className="relative bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-destructive/20 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-destructive" />
          </button>
          
          <div className="flex items-start gap-3 pr-6">
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-destructive text-sm">
                Pending Cancellation Penalty
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                You have a pending penalty of{" "}
                <span className="font-semibold text-destructive">₹{totalPenalty}</span>{" "}
                from a previous booking cancellation. This amount will be added to your next booking.
              </p>
              <Link 
                to="/my-bookings" 
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                View details →
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PenaltyWarningBanner;
