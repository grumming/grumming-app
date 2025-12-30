import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { useSalonOwner } from "@/hooks/useSalonOwner";

const Index = () => {
  const navigate = useNavigate();
  // Handle pending profile updates after signup
  usePendingProfile();
  
  const { isSalonOwner, ownedSalons, isLoading: isOwnerLoading } = useSalonOwner();

  // Smooth scroll to top when returning to homepage
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Auto-redirect salon owners to their dashboard
  useEffect(() => {
    if (!isOwnerLoading && isSalonOwner && ownedSalons.length > 0) {
      navigate('/salon-dashboard', { replace: true });
    }
  }, [isOwnerLoading, isSalonOwner, ownedSalons, navigate]);

  // Show nothing while checking ownership to avoid flash
  if (isOwnerLoading) {
    return null;
  }

  // If salon owner with salons, they'll be redirected - don't render customer UI
  if (isSalonOwner && ownedSalons.length > 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="pt-16 pb-24 flex-1">
        <SalonApprovalBanner />
        <WelcomeBanner />
        {/* Hide customer promotional banners for salon owners */}
        {!isSalonOwner && (
          <>
            <FirstBookingBanner />
            <CashbackBanner />
          </>
        )}
        <FeaturedSalons />
      </main>
      <Footer />
      <BackToTop />
      <BottomNav />
    </div>
  );
};

export default Index;
