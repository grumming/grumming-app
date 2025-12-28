import Header from "@/components/Header";
import FirstBookingBanner from "@/components/FirstBookingBanner";
import CashbackBanner from "@/components/CashbackBanner";
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
        <FirstBookingBanner />
        <CashbackBanner />
        <FeaturedSalons />
        <AppPromo />
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
