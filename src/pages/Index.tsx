import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturedSalons from "@/components/FeaturedSalons";
import AppPromo from "@/components/AppPromo";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <Header />
      <main className="pt-16">
        <HeroSection />
        <FeaturedSalons />
        <AppPromo />
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
