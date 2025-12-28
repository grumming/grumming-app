import Header from "@/components/Header";
import FirstBookingBanner from "@/components/FirstBookingBanner";
import CashbackBanner from "@/components/CashbackBanner";
import FeaturedSalons from "@/components/FeaturedSalons";
import AppPromo from "@/components/AppPromo";
import BottomNav from "@/components/BottomNav";
import WelcomeBanner from "@/components/WelcomeBanner";
import Footer from "@/components/Footer";
import { usePendingProfile } from "@/hooks/usePendingProfile";

const Index = () => {
  // Handle pending profile updates after signup
  usePendingProfile();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 pb-24">
        <WelcomeBanner />
        <FirstBookingBanner />
        <CashbackBanner />
        <FeaturedSalons />
        <AppPromo />
        <Footer />
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
