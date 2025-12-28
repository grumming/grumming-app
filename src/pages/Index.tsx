import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CashbackBanner from "@/components/CashbackBanner";
import FeaturedSalons from "@/components/FeaturedSalons";
import AppPromo from "@/components/AppPromo";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 pb-24">
        <HeroSection />
        <CashbackBanner />
        <FeaturedSalons />
        <AppPromo />
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
