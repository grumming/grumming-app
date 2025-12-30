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
 * to their salon dashboard. No localStorage flags needed.
 */
export const SalonOwnerRouteGuard = ({ children }: SalonOwnerRouteGuardProps) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isSalonOwner, setIsSalonOwner] = useState(false);

  useEffect(() => {
    const checkSalonOwnerStatus = async () => {
      // Wait for auth to finish loading
      if (authLoading) return;

      // No user = not a salon owner, allow access
      if (!user) {
        setIsChecking(false);
        setIsSalonOwner(false);
        return;
      }

      try {
        // Check if user has salon_owner role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'salon_owner')
          .maybeSingle();

        if (roleData) {
          // User is a salon owner - check if they have any salons
          const { data: ownerData } = await supabase
            .from('salon_owners')
            .select('salon_id, salons(name)')
            .eq('user_id', user.id);

          if (ownerData && ownerData.length > 0) {
            // Store salon name for welcome toast if needed
            const salonName = (ownerData[0] as any)?.salons?.name;
            if (salonName) {
              localStorage.setItem('welcomeBackSalon', salonName);
            }
            setIsSalonOwner(true);
            navigate('/salon-dashboard', { replace: true });
            return;
          }
        }

        // Not a salon owner or no salons - allow access to customer pages
        setIsSalonOwner(false);
      } catch (err) {
        console.error('Error checking salon owner status:', err);
        setIsSalonOwner(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkSalonOwnerStatus();
  }, [user, authLoading, navigate, location.pathname]);

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

  // If salon owner, don't render children (redirect is happening)
  if (isSalonOwner) {
    return null;
  }

  return <>{children}</>;
};

export default SalonOwnerRouteGuard;
