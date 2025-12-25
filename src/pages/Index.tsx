import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturedSalons from "@/components/FeaturedSalons";
import AppPromo from "@/components/AppPromo";
import BottomNav from "@/components/BottomNav";
import { LocationProvider } from "@/contexts/LocationContext";

const Index = () => {
  return (
    <LocationProvider>
      <div className="min-h-screen bg-background pb-20 sm:pb-0">
        <Header />
        <main className="pt-16">
          <HeroSection />
          <FeaturedSalons />
          <AppPromo />
        </main>
        <BottomNav />
      </div>
    </LocationProvider>
  );
};

export default Index;
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAl-C6_m_jeHiBxmX4rUgCzN14eftpTBeI",
  authDomain: "grumming-552d2.firebaseapp.com",
  projectId: "grumming-552d2",
  storageBucket: "grumming-552d2.firebasestorage.app",
  messagingSenderId: "901278748260",
  appId: "1:901278748260:web:7a1968f59c9aa08680d971",
  measurementId: "G-NTH8DNDRV5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
