import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FirstBookingBanner from "@/components/FirstBookingBanner";
import CashbackBanner from "@/components/CashbackBanner";
import FeaturedSalons from "@/components/FeaturedSalons";
import AppPromo from "@/components/AppPromo";
import BottomNav from "@/components/BottomNav";
import WelcomeBanner from "@/components/WelcomeBanner";
import Footer from "@/components/Footer";
import { usePendingProfile } from "@/hooks/usePendingProfile";

const Index = () => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // Handle pending profile updates after signup
  usePendingProfile();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 pb-24">
        <HeroSection onSearchActiveChange={setIsSearchActive} />
        <WelcomeBanner />
        <AnimatePresence>
          {!isSearchActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FirstBookingBanner />
              <CashbackBanner />
            </motion.div>
          )}
        </AnimatePresence>
        <FeaturedSalons />
        <AppPromo />
        <Footer />
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
