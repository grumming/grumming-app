import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { PushNotificationSetup } from "@/components/PushNotificationSetup";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import SalonDetail from "./pages/SalonDetail";
import BookingConfirmation from "./pages/BookingConfirmation";
import NotificationSettings from "./pages/NotificationSettings";
import MyBookings from "./pages/MyBookings";
import SearchSalons from "./pages/SearchSalons";
import Referrals from "./pages/Referrals";
import NotFound from "./pages/NotFound";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <AuthProvider>
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
                <Route path="/search" element={<SearchSalons />} />
                <Route path="/referrals" element={<Referrals />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
