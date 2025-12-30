import { useEffect, useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const checkSalonOwnerStatus = async () => {
      // Wait for auth to finish loading
      if (authLoading) return;

      // No user = not a salon owner, allow access immediately
      if (!user) {
        setIsChecking(false);
        setShouldRedirect(false);
        return;
      }

      // Check if user logged in via salon owner flow
      const pendingSalonOwnerRegistration = localStorage.getItem('pendingSalonOwnerRegistration');
      const postLoginMode = localStorage.getItem('postLoginMode');
      const isSalonOwnerLogin = pendingSalonOwnerRegistration === 'true' || postLoginMode === 'salon_owner';

      // Clear the flags after reading
      if (pendingSalonOwnerRegistration) {
        localStorage.removeItem('pendingSalonOwnerRegistration');
      }
      if (postLoginMode) {
        localStorage.removeItem('postLoginMode');
      }

      // If user didn't log in via salon owner flow, allow customer pages
      if (!isSalonOwnerLogin) {
        setIsChecking(false);
        setShouldRedirect(false);
        return;
      }

      try {
        // Check if user owns a salon (direct check - most reliable)
        const { data: ownerData, error: ownerErr } = await supabase
          .from('salon_owners')
          .select('salon_id, salons(name)')
          .eq('user_id', user.id)
          .limit(1);

        if (!ownerErr && ownerData && ownerData.length > 0) {
          // User owns a salon - redirect to dashboard
          const salonName = (ownerData[0] as any)?.salons?.name;
          if (salonName) {
            localStorage.setItem('welcomeBackSalon', salonName);
          }
          setShouldRedirect(true);
          setIsChecking(false);
          navigate('/salon-dashboard', { replace: true });
          return;
        }

        // Check if user has salon_owner role but no salon yet
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'salon_owner')
          .maybeSingle();

        if (roleData) {
          // Has role but no salon - redirect to registration
          setShouldRedirect(true);
          setIsChecking(false);
          navigate('/salon-registration', { replace: true });
          return;
        }

        // Not a salon owner - allow customer pages
        setShouldRedirect(false);
        setIsChecking(false);
      } catch (err) {
        console.error('Error checking salon owner status:', err);
        setShouldRedirect(false);
        setIsChecking(false);
      }
    };

    checkSalonOwnerStatus();
  }, [user, authLoading, navigate]);

  // Show loading while auth is initializing or checking owner status
  if (authLoading || isChecking) {
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
