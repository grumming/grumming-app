import { useEffect } from "react";
import Header from "@/components/Header";
import FirstBookingBanner from "@/components/FirstBookingBanner";
import CashbackBanner from "@/components/CashbackBanner";
import FeaturedSalons from "@/components/FeaturedSalons";
import BottomNav from "@/components/BottomNav";
import WelcomeBanner from "@/components/WelcomeBanner";
import SalonApprovalBanner from "@/components/SalonApprovalBanner";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import { usePendingProfile } from "@/hooks/usePendingProfile";
import { Loader2 } from "lucide-react";

const Index = () => {
  // Handle pending profile updates after signup
  const { isCheckingOwnerStatus } = usePendingProfile();

  // Smooth scroll to top when returning to homepage
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Show loading screen while checking salon owner status
  if (isCheckingOwnerStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="pt-16 pb-24 flex-1">
        <SalonApprovalBanner />
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
