import { Suspense, lazy, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LocationProvider } from "@/contexts/LocationContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { PushNotificationSetup } from "@/components/PushNotificationSetup";
import { DeepLinkHandler } from "@/components/DeepLinkHandler";
import { SalonOwnerRouteGuard } from "@/components/SalonOwnerRouteGuard";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

// Keep the home page eagerly loaded to avoid a blank screen if dynamic imports stall.
import Index from "./pages/Index";

// Lazy-load non-home pages to reduce initial bundle size.
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Settings = lazy(() => import("./pages/Settings"));
const PrivacySecurity = lazy(() => import("./pages/PrivacySecurity"));
const SalonDetail = lazy(() => import("./pages/SalonDetail"));
const BookingConfirmation = lazy(() => import("./pages/BookingConfirmation"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const MyVouchers = lazy(() => import("./pages/MyVouchers"));
const SavedAddresses = lazy(() => import("./pages/SavedAddresses"));
const SearchSalons = lazy(() => import("./pages/SearchSalons"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Favorites = lazy(() => import("./pages/Favorites"));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const ContactSupport = lazy(() => import("./pages/ContactSupport"));
const Chat = lazy(() => import("./pages/Chat"));
const SalonDashboard = lazy(() => import("./pages/SalonDashboard"));
const SalonRegistration = lazy(() => import("./pages/SalonRegistration"));
const SalonOwnerAuth = lazy(() => import("./pages/SalonOwnerAuth"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AppLoading = () => <div className="min-h-screen bg-background" />;

const App = () => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 1, // 1 minute default
        gcTime: 1000 * 60 * 10, // 10 minute garbage collection
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  }));

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

      // Suppress property descriptor errors from extensions (crypto wallets)
      const isPropertyDescriptorError =
        message.includes("Invalid property descriptor") ||
        message.includes("Cannot redefine property") ||
        message.includes("Cannot set property ethereum");

      if (isPropertyDescriptorError && isExtensionSource) return true;

      // Only suppress errors clearly coming from extensions/injected scripts.
      // (Never suppress app errors — it can cause silent blank screens.)
      return isExtensionSource;
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
        <WalletProvider>
          <FavoritesProvider>
            <LocationProvider>
              <TooltipProvider>
                <AppErrorBoundary>
                  <Suspense fallback={<AppLoading />}>
                    <PushNotificationSetup />
                    <Toaster />
                    <Sonner />

                    <BrowserRouter>
                      <DeepLinkHandler />

                      <Routes>
                        <Route
                          path="/"
                          element={
                            <SalonOwnerRouteGuard>
                              <Index />
                            </SalonOwnerRouteGuard>
                          }
                        />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/edit-profile" element={<EditProfile />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/privacy-security" element={<PrivacySecurity />} />
                        <Route path="/salon/:id" element={<SalonDetail />} />
                        <Route path="/booking-confirmation" element={<BookingConfirmation />} />
                        <Route path="/notification-settings" element={<NotificationSettings />} />
                        <Route
                          path="/my-bookings"
                          element={
                            <SalonOwnerRouteGuard>
                              <MyBookings />
                            </SalonOwnerRouteGuard>
                          }
                        />
                        <Route
                          path="/my-vouchers"
                          element={
                            <SalonOwnerRouteGuard>
                              <MyVouchers />
                            </SalonOwnerRouteGuard>
                          }
                        />
                        <Route path="/saved-addresses" element={<SavedAddresses />} />
                        <Route
                          path="/search"
                          element={
                            <SalonOwnerRouteGuard>
                              <SearchSalons />
                            </SalonOwnerRouteGuard>
                          }
                        />
                        <Route path="/wallet" element={<Wallet />} />
                        <Route
                          path="/favorites"
                          element={
                            <SalonOwnerRouteGuard>
                              <Favorites />
                            </SalonOwnerRouteGuard>
                          }
                        />
                        <Route path="/payment-methods" element={<PaymentMethods />} />
                        <Route path="/payment-history" element={<PaymentHistory />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/salon-dashboard" element={<SalonDashboard />} />
                        <Route path="/salon-registration" element={<SalonRegistration />} />
                        <Route path="/salon-owner-auth" element={<SalonOwnerAuth />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/refund-policy" element={<RefundPolicy />} />
                        <Route path="/contact-support" element={<ContactSupport />} />
                        <Route path="/chat" element={<Chat />} />
                        <Route path="/chat/:conversationId" element={<Chat />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </BrowserRouter>
                  </Suspense>
                </AppErrorBoundary>
              </TooltipProvider>
            </LocationProvider>
          </FavoritesProvider>
        </WalletProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

