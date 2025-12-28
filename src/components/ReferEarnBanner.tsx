import { Gift, Users, ArrowRight, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useReferral } from "@/hooks/useReferral";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const ReferEarnBanner = () => {
  const { user } = useAuth();
  const { referralCode, getShareText } = useReferral();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!referralCode) return;
    
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleShare = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (navigator.share && referralCode) {
      try {
        await navigator.share({
          title: "Join Grumming!",
          text: getShareText(),
          url: `${window.location.origin}/auth?ref=${referralCode}`,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      navigate("/referrals");
    }
  };

  return (
    <section className="px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 shadow-lg"
      >
        {/* Decorative elements */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute right-12 bottom-8 h-16 w-16 rounded-full bg-white/5" />
        
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
              <Gift className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-primary-foreground">
                Refer & Earn ₹100
              </h3>
              <p className="mt-1 text-sm text-primary-foreground/80">
                Invite friends and both of you get ₹100 when they complete their first booking!
              </p>
            </div>
          </div>

          {user && referralCode ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 rounded-lg bg-white/20 px-4 py-2.5 backdrop-blur-sm">
                <span className="text-xs text-primary-foreground/70">Your code:</span>
                <span className="font-mono text-lg font-bold tracking-wider text-primary-foreground">
                  {referralCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="ml-auto rounded-md p-1.5 transition-colors hover:bg-white/20"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <Copy className="h-4 w-4 text-primary-foreground/70" />
                  )}
                </button>
              </div>
              <Button
                onClick={handleShare}
                variant="secondary"
                className="gap-2 bg-white text-primary hover:bg-white/90"
              >
                <Users className="h-4 w-4" />
                Share Now
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate(user ? "/referrals" : "/auth")}
                variant="secondary"
                className="gap-2 bg-white text-primary hover:bg-white/90"
              >
                {user ? "View Referrals" : "Sign Up to Refer"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 text-sm text-primary-foreground/70">
                <Users className="h-4 w-4" />
                <span>1000+ referrals made</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
};

export default ReferEarnBanner;
