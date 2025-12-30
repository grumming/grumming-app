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
import { SalonOwnerRouteGuard } from "@/components/SalonOwnerRouteGuard";

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
import SalonDashboard from "./pages/SalonDashboard";
import SalonRegistration from "./pages/SalonRegistration";
import SalonOwnerAuth from "./pages/SalonOwnerAuth";
import NotFound from "./pages/NotFound";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    const shouldSuppressExtensionError = (opts: {
      message?: string;
      stack?: string;
      filename?: string;
    }) => {
      const message = opts.message ?? "";
      const stack = opts.stack ?? "";
      const filename = opts.filename ?? "";

      const isExtensionFilename =
        filename.includes("chrome-extension://") || filename.includes("moz-extension://");

      const isExtensionStack =
        stack.includes("chrome-extension://") ||
        stack.includes("moz-extension://") ||
        stack.includes("nkbihfbeogaeaoehlefnkodbefgpgknn") ||
        stack.includes("inpage.js");

      const isExtensionSource = isExtensionFilename || isExtensionStack;

      // In dev/preview, suppress ALL extension-sourced errors (they can cause false blank screens)
      if (import.meta.env.DEV && isExtensionSource) return true;

      // In production, always suppress errors whose *source file* is a browser extension.
      // These are injected by extensions and are not actionable for our app.
      if (!import.meta.env.DEV && isExtensionFilename) return true;

      // In production, additionally suppress wallet-related errors when they come from extension scripts.
      const isWalletRelated =
        /metamask|phantom|wallet|ethereum/i.test(message) ||
        message.includes("Failed to connect to MetaMask");

      return isWalletRelated && isExtensionStack;
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason: any = event.reason;
      const message =
        typeof reason === "string" ? reason : (reason?.message as string | undefined);
      const stack =
        typeof reason === "object" && reason ? (reason?.stack as string | undefined) : undefined;

      if (shouldSuppressExtensionError({ message, stack })) {
        event.preventDefault();
      }
    };

    const onError = (event: ErrorEvent) => {
      if (
        shouldSuppressExtensionError({
          message: event.message,
          stack: (event.error as any)?.stack,
          filename: event.filename,
        })
      ) {
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
                  <Route path="/" element={<SalonOwnerRouteGuard><Index /></SalonOwnerRouteGuard>} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/edit-profile" element={<EditProfile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/privacy-security" element={<PrivacySecurity />} />
                  <Route path="/salon/:id" element={<SalonDetail />} />
                  <Route path="/booking-confirmation" element={<BookingConfirmation />} />
                  <Route path="/notification-settings" element={<NotificationSettings />} />
                  <Route path="/my-bookings" element={<SalonOwnerRouteGuard><MyBookings /></SalonOwnerRouteGuard>} />
                  <Route path="/my-vouchers" element={<SalonOwnerRouteGuard><MyVouchers /></SalonOwnerRouteGuard>} />
                  <Route path="/saved-addresses" element={<SavedAddresses />} />
                  <Route path="/search" element={<SalonOwnerRouteGuard><SearchSalons /></SalonOwnerRouteGuard>} />
                  <Route path="/referrals" element={<SalonOwnerRouteGuard><Referrals /></SalonOwnerRouteGuard>} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/favorites" element={<SalonOwnerRouteGuard><Favorites /></SalonOwnerRouteGuard>} />
                  <Route path="/payment-methods" element={<PaymentMethods />} />
                  <Route path="/payment-history" element={<PaymentHistory />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/promo-codes" element={<AdminPromoCodes />} />
                  <Route path="/salon-dashboard" element={<SalonDashboard />} />
                  <Route path="/salon-registration" element={<SalonRegistration />} />
                  <Route path="/salon-owner-auth" element={<SalonOwnerAuth />} />
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
