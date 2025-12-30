import { useEffect, useState } from "react";
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
import { DeepLinkHandler } from "@/components/DeepLinkHandler";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
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
import AdminDashboard from "./pages/AdminDashboard";
import Wallet from "./pages/Wallet";
import Favorites from "./pages/Favorites";
import PaymentMethods from "./pages/PaymentMethods";
import PaymentHistory from "./pages/PaymentHistory";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    const shouldSuppressWalletExtensionError = (opts: {
      message?: string;
      stack?: string;
      filename?: string;
    }) => {
      const message = opts.message ?? "";
      const stack = opts.stack ?? "";
      const filename = opts.filename ?? "";

      // Only suppress wallet-related extension errors
      const isWalletRelated = /metamask|phantom|wallet|ethereum/i.test(message) ||
        message.includes("Failed to connect to MetaMask");

      const isExtensionSource =
        filename.includes("chrome-extension://") ||
        filename.includes("moz-extension://") ||
        stack.includes("chrome-extension://") ||
        stack.includes("moz-extension://") ||
        stack.includes("nkbihfbeogaeaoehlefnkodbefgpgknn") ||
        stack.includes("inpage.js");

      return isWalletRelated && isExtensionSource;
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason: any = event.reason;
      const message =
        typeof reason === "string" ? reason : (reason?.message as string | undefined);
      const stack =
        typeof reason === "object" && reason ? (reason?.stack as string | undefined) : undefined;

      if (shouldSuppressWalletExtensionError({ message, stack })) {
        event.preventDefault();
      }
    };

    const onError = (event: ErrorEvent) => {
      if (shouldSuppressWalletExtensionError({
        message: event.message,
        stack: (event.error as any)?.stack,
        filename: event.filename,
      })) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError, true);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError, true);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FavoritesProvider>
          <LocationProvider>
            <TooltipProvider>
              <PushNotificationSetup />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ReferralRewardListener />
                <DeepLinkHandler />
                
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/edit-profile" element={<EditProfile />} />
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
                  <Route path="/payment-history" element={<PaymentHistory />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/promo-codes" element={<AdminPromoCodes />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/chat/:conversationId" element={<Chat />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </LocationProvider>
        </FavoritesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
