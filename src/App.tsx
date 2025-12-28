import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { LocationProvider } from "@/contexts/LocationContext";
import { PushNotificationSetup } from "@/components/PushNotificationSetup";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
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
import NotFound from "./pages/NotFound";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <AuthProvider>
          <LocationProvider>
            <TooltipProvider>
              <PushNotificationSetup />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/salon/:id" element={<SalonDetail />} />
                  <Route path="/booking-confirmation" element={<BookingConfirmation />} />
                  <Route path="/notification-settings" element={<NotificationSettings />} />
                  <Route path="/my-bookings" element={<MyBookings />} />
                  <Route path="/my-vouchers" element={<MyVouchers />} />
                  <Route path="/saved-addresses" element={<SavedAddresses />} />
                  <Route path="/search" element={<SearchSalons />} />
                  <Route path="/referrals" element={<Referrals />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/admin/promo-codes" element={<AdminPromoCodes />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </LocationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
