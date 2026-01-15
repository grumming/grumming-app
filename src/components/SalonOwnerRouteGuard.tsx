import { useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSalonOwner } from '@/hooks/useSalonOwner';
import { Loader2 } from 'lucide-react';

interface SalonOwnerRouteGuardProps {
  children: ReactNode;
}

/**
 * Global route guard that redirects salon owners away from customer pages
 * to their salon dashboard ONLY if they logged in via the salon owner flow.
 * Customers who happen to own salons are NOT redirected.
 */
export const SalonOwnerRouteGuard = ({ children }: SalonOwnerRouteGuardProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isSalonOwner, hasOwnership, ownedSalons, isLoading: ownerLoading } = useSalonOwner();
  const navigate = useNavigate();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // Wait for auth and owner data to finish loading
    if (authLoading || ownerLoading) return;

    // No user = not a salon owner, allow access immediately
    if (!user) {
      setShouldRedirect(false);
      return;
    }

    // Check if user logged in via salon owner flow
    const pendingSalonOwnerRegistration = localStorage.getItem('pendingSalonOwnerRegistration');
    const postLoginMode = localStorage.getItem('postLoginMode');
    const isSalonOwnerLogin = pendingSalonOwnerRegistration === 'true' || postLoginMode === 'salon_owner';

    // If user didn't log in via salon owner flow, allow customer pages
    if (!isSalonOwnerLogin) {
      setShouldRedirect(false);
      return;
    }

    // User logged in via salon owner flow - check ownership status
    if (hasOwnership && ownedSalons.length > 0) {
      // User owns a salon - redirect to dashboard
      localStorage.removeItem('pendingSalonOwnerRegistration');
      localStorage.removeItem('postLoginMode');
      
      const salonName = ownedSalons[0]?.name;
      if (salonName) {
        localStorage.setItem('welcomeBackSalon', salonName);
      }
      setShouldRedirect(true);
      navigate('/salon-dashboard', { replace: true });
      return;
    }

    if (isSalonOwner && !hasOwnership) {
      // Has role but no salon - redirect to registration
      localStorage.removeItem('pendingSalonOwnerRegistration');
      localStorage.removeItem('postLoginMode');
      
      setShouldRedirect(true);
      navigate('/salon-registration', { replace: true });
      return;
    }

    // User is not a salon owner yet - redirect to registration for new salon owners
    localStorage.removeItem('pendingSalonOwnerRegistration');
    localStorage.removeItem('postLoginMode');
    
    setShouldRedirect(true);
    navigate('/salon-registration', { replace: true });
  }, [user, authLoading, ownerLoading, isSalonOwner, hasOwnership, ownedSalons, navigate]);

  // Show loading while auth is initializing or checking owner status
  if (authLoading || ownerLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If redirecting, don't render children
  if (shouldRedirect) {
    return null;
  }

  return <>{children}</>;
};

export default SalonOwnerRouteGuard;
