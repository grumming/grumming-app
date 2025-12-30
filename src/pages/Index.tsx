import { useEffect } from "react";
import Header from "@/components/Header";
import FirstBookingBanner from "@/components/FirstBookingBanner";
import CashbackBanner from "@/components/CashbackBanner";
import FeaturedSalons from "@/components/FeaturedSalons";
import BottomNav from "@/components/BottomNav";
import WelcomeBanner from "@/components/WelcomeBanner";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import { usePendingProfile } from "@/hooks/usePendingProfile";

const Index = () => {
  // Handle pending profile updates after signup
  usePendingProfile();

  // Smooth scroll to top when returning to homepage
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="pt-16 pb-24 flex-1">
        <WelcomeBanner />
        <FirstBookingBanner />
        <CashbackBanner />
        <FeaturedSalons />
      </main>
      <Footer />
      <BackToTop />
      <BottomNav />
    </div>
  );
};

export default Index;
