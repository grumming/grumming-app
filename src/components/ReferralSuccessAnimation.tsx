import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles, PartyPopper, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReferralSuccessAnimationProps {
  isVisible: boolean;
  onClose: () => void;
  rewardAmount?: number;
}

const ReferralSuccessAnimation = ({
  isVisible,
  onClose,
  rewardAmount = 100,
}: ReferralSuccessAnimationProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          {/* Confetti particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 0,
                  x: "50vw",
                  y: "50vh",
                  scale: 0,
                }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  x: `${Math.random() * 100}vw`,
                  y: `${Math.random() * 100}vh`,
                  scale: [0, 1, 1, 0.5],
                  rotate: Math.random() * 360,
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.05,
                  ease: "easeOut",
                }}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  backgroundColor: [
                    "hsl(var(--primary))",
                    "hsl(var(--secondary))",
                    "#FFD700",
                    "#FF6B6B",
                    "#4ECDC4",
                    "#A78BFA",
                  ][i % 6],
                }}
              />
            ))}
          </div>

          {/* Sparkle effects */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 1.5,
                delay: 0.2 + i * 0.15,
                repeat: Infinity,
                repeatDelay: 1,
              }}
              className="absolute"
              style={{
                left: `${30 + Math.random() * 40}%`,
                top: `${20 + Math.random() * 40}%`,
              }}
            >
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </motion.div>
          ))}

          {/* Main content */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            className="relative bg-card border border-border rounded-3xl p-8 mx-4 max-w-sm w-full shadow-2xl"
          >
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
                delay: 0.2,
              }}
              className="mx-auto mb-6 relative"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto">
                <motion.div
                  animate={{
                    rotate: [0, -10, 10, -10, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    delay: 0.5,
                    repeat: 2,
                  }}
                >
                  <Gift className="w-12 h-12 text-primary-foreground" />
                </motion.div>
              </div>

              {/* Check badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center border-4 border-card"
              >
                <Check className="w-5 h-5 text-white" />
              </motion.div>
            </motion.div>

            {/* Text content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center space-y-3"
            >
              <div className="flex items-center justify-center gap-2">
                <PartyPopper className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">
                  Referral Applied!
                </h2>
                <PartyPopper className="w-6 h-6 text-primary transform scale-x-[-1]" />
              </div>

              <p className="text-muted-foreground">
                You've unlocked a special welcome reward
              </p>

              {/* Reward amount */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 0.5,
                  type: "spring",
                  stiffness: 300,
                }}
                className="py-4"
              >
                <div className="inline-flex items-center gap-2 bg-primary/10 rounded-2xl px-6 py-3">
                  <span className="text-4xl font-bold text-primary">
                    ₹{rewardAmount}
                  </span>
                  <span className="text-sm text-primary/80 font-medium">
                    OFF
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  on your first booking
                </p>
              </motion.div>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button onClick={onClose} className="w-full h-12 text-base font-semibold mt-4">
                Start Exploring
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReferralSuccessAnimation;
