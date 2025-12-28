import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LocationProvider } from "@/contexts/LocationContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { PushNotificationSetup } from "@/components/PushNotificationSetup";
import { ReferralRewardListener } from "@/components/ReferralRewardListener";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import PrivacySecurity from "./pages/PrivacySecurity";
import SalonDetail from "./pages/SalonDetail";
import BookingConfirmation from "./pages/BookingConfirmation";
import NotificationSettings from "./pages/NotificationSettings";
import MyBookings from "./pages/MyBookings";
import MyVouchers from "./pages/MyVouchers";
import SavedAddresses from "./pages/SavedAddresses";
import SearchSalons from "./pages/SearchSalons";
import Referrals from "./pages/Referrals";
import AdminPromoCodes from "./pages/AdminPromoCodes";
import Wallet from "./pages/Wallet";
import Favorites from "./pages/Favorites";
import PaymentMethods from "./pages/PaymentMethods";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthProvider>
          <FavoritesProvider>
            <LocationProvider>
              <TooltipProvider>
                <PushNotificationSetup />
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <ReferralRewardListener />
                  
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/privacy-security" element={<PrivacySecurity />} />
                    <Route path="/salon/:id" element={<SalonDetail />} />
                    <Route path="/booking-confirmation" element={<BookingConfirmation />} />
                    <Route path="/notification-settings" element={<NotificationSettings />} />
                    <Route path="/my-bookings" element={<MyBookings />} />
                    <Route path="/my-vouchers" element={<MyVouchers />} />
                    <Route path="/saved-addresses" element={<SavedAddresses />} />
                    <Route path="/search" element={<SearchSalons />} />
                    <Route path="/referrals" element={<Referrals />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/payment-methods" element={<PaymentMethods />} />
                    <Route path="/admin/promo-codes" element={<AdminPromoCodes />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </LocationProvider>
          </FavoritesProvider>
        </AuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
