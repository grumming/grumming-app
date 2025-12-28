import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FirstBookingBanner from "@/components/FirstBookingBanner";
import CashbackBanner from "@/components/CashbackBanner";
import ReferEarnBanner from "@/components/ReferEarnBanner";
import FeaturedSalons from "@/components/FeaturedSalons";
import AppPromo from "@/components/AppPromo";
import BottomNav from "@/components/BottomNav";
import WelcomeBanner from "@/components/WelcomeBanner";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <WelcomeBanner />
      <main className="pt-16 pb-24">
        <HeroSection />
        <FirstBookingBanner />
        <CashbackBanner />
        <ReferEarnBanner />
        <FeaturedSalons />
        <AppPromo />
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
