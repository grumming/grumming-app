import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface OwnedSalon {
  id: string;
  name: string;
  location: string;
  city: string;
  image_url: string | null;
  is_active: boolean;
  is_primary: boolean;
  status: 'pending' | 'approved' | 'rejected';
}

export const useSalonOwner = () => {
  const { user } = useAuth();
  const [isSalonOwner, setIsSalonOwner] = useState(false);
  const [ownedSalons, setOwnedSalons] = useState<OwnedSalon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSalonOwnership = async () => {
      if (!user) {
        setIsSalonOwner(false);
        setOwnedSalons([]);
        setIsLoading(false);
        return;
      }

      try {
        // First check if user has any salon ownership records (regardless of role)
        const { data: ownershipData, error } = await supabase
          .from('salon_owners')
          .select(`
            is_primary,
            salons (
              id,
              name,
              location,
              city,
              image_url,
              is_active,
              status
            )
          `)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching owned salons:', error);
          setIsSalonOwner(false);
          setOwnedSalons([]);
        } else if (ownershipData && ownershipData.length > 0) {
          setIsSalonOwner(true);
          const salons = ownershipData
            .filter((o: any) => o.salons)
            .map((o: any) => ({
              ...o.salons,
              is_primary: o.is_primary
            }));
          setOwnedSalons(salons);
        } else {
          // No ownership records - check if user has salon_owner role but no salons yet
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'salon_owner')
            .maybeSingle();

          setIsSalonOwner(!!roleData);
          setOwnedSalons([]);
        }
      } catch (err) {
        console.error('Error checking salon ownership:', err);
        setIsSalonOwner(false);
        setOwnedSalons([]);
      }

      setIsLoading(false);
    };

    checkSalonOwnership();
  }, [user]);

  return { isSalonOwner, ownedSalons, isLoading };
};

export default useSalonOwner;