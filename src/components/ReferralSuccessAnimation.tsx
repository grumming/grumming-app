import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, PartyPopper, Check } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

interface ReferralSuccessAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
  rewardAmount?: number;
}

// Play celebration sound using Web Audio API
const playCelebrationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioContext.currentTime;

    // Create a cheerful ascending arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    
    notes.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now + index * 0.1);
      
      gainNode.gain.setValueAtTime(0, now + index * 0.1);
      gainNode.gain.linearRampToValueAtTime(0.3, now + index * 0.1 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.1 + 0.3);
      
      oscillator.start(now + index * 0.1);
      oscillator.stop(now + index * 0.1 + 0.35);
    });

    // Add a final sparkle effect
    setTimeout(() => {
      const sparkleOsc = audioContext.createOscillator();
      const sparkleGain = audioContext.createGain();
      
      sparkleOsc.connect(sparkleGain);
      sparkleGain.connect(audioContext.destination);
      
      sparkleOsc.type = 'triangle';
      sparkleOsc.frequency.setValueAtTime(1318.5, audioContext.currentTime); // E6
      
      sparkleGain.gain.setValueAtTime(0.2, audioContext.currentTime);
      sparkleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      sparkleOsc.start();
      sparkleOsc.stop(audioContext.currentTime + 0.5);
    }, 450);
  } catch (error) {
    console.log('Audio playback not supported');
  }
};

export const ReferralSuccessAnimation = ({ 
  isVisible, 
  onComplete,
  rewardAmount = 100 
}: ReferralSuccessAnimationProps) => {
  const [showConfetti, setShowConfetti] = useState(false);

  const playSound = useCallback(() => {
    playCelebrationSound();
  }, []);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      playSound();
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete, playSound]);

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
          {showConfetti && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    x: '50vw',
                    y: '50vh',
                    scale: 0,
                    rotate: 0,
                  }}
                  animate={{
                    x: `${Math.random() * 100}vw`,
                    y: `${Math.random() * 100}vh`,
                    scale: [0, 1, 1, 0],
                    rotate: Math.random() * 720 - 360,
                  }}
                  transition={{
                    duration: 2.5,
                    delay: i * 0.03,
                    ease: 'easeOut',
                  }}
                  className={`absolute w-3 h-3 rounded-full ${
                    ['bg-primary', 'bg-yellow-400', 'bg-green-400', 'bg-pink-400', 'bg-blue-400'][i % 5]
                  }`}
                />
              ))}
              {/* Star confetti */}
              {[...Array(15)].map((_, i) => (
                <motion.div
                  key={`star-${i}`}
                  initial={{
                    x: '50vw',
                    y: '50vh',
                    scale: 0,
                    rotate: 0,
                  }}
                  animate={{
                    x: `${Math.random() * 100}vw`,
                    y: `${Math.random() * 100}vh`,
                    scale: [0, 1.5, 1.5, 0],
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.2 + i * 0.05,
                    ease: 'easeOut',
                  }}
                >
                  <Sparkles className={`w-4 h-4 ${
                    ['text-primary', 'text-yellow-400', 'text-pink-400'][i % 3]
                  }`} />
                </motion.div>
              ))}
            </div>
          )}

          {/* Main animation card */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
            }}
            className="relative bg-card border border-border rounded-3xl p-8 mx-4 shadow-elegant text-center max-w-sm"
          >
            {/* Animated gift icon */}
            <motion.div
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              className="relative mx-auto mb-6"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, 0],
                }}
                transition={{
                  duration: 0.5,
                  repeat: 3,
                  repeatDelay: 0.3,
                }}
                className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center"
              >
                <motion.div
                  animate={{
                    y: [0, -5, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                >
                  <Gift className="w-12 h-12 text-primary" />
                </motion.div>
              </motion.div>

              {/* Success checkmark overlay */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
                className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
              >
                <Check className="w-6 h-6 text-white" strokeWidth={3} />
              </motion.div>

              {/* Floating sparkles */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -top-1 -left-3"
              >
                <PartyPopper className="w-5 h-5 text-pink-400" />
              </motion.div>
            </motion.div>

            {/* Text content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Referral Applied! 🎉
              </h2>
              <p className="text-muted-foreground mb-4">
                Welcome to Grumming! Your friend will be rewarded too.
              </p>
              
              {/* Reward amount */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20"
              >
                <span className="text-lg text-muted-foreground">You got</span>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="text-2xl font-bold text-primary"
                >
                  ₹{rewardAmount}
                </motion.span>
                <span className="text-lg text-muted-foreground">OFF!</span>
              </motion.div>
            </motion.div>

            {/* Dismiss hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-xs text-muted-foreground mt-6"
            >
              Redirecting you to the app...
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
