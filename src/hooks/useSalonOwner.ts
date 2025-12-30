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
}

export const useSalonOwner = () => {
  const { user } = useAuth();
  const [isSalonOwner, setIsSalonOwner] = useState(false);
  const [ownedSalons, setOwnedSalons] = useState<OwnedSalon[]>([]);
  const [hasOwnership, setHasOwnership] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSalonOwnership = async () => {
      if (!user) {
        setIsSalonOwner(false);
        setOwnedSalons([]);
        setHasOwnership(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // 1) Most reliable: direct ownership records (supports legacy accounts without role rows)
        const { data: ownershipData, error: ownershipError } = await supabase
          .from('salon_owners')
          .select('salon_id, is_primary')
          .eq('user_id', user.id);

        if (ownershipError) {
          console.error('Error fetching salon ownership:', ownershipError);
          setIsSalonOwner(false);
          setOwnedSalons([]);
          setHasOwnership(false);
          return;
        }

        if (ownershipData && ownershipData.length > 0) {
          setIsSalonOwner(true);
          setHasOwnership(true);

          const salonIds = ownershipData.map((o) => o.salon_id);
          const { data: salonsData, error: salonsError } = await supabase
            .from('salons')
            .select('id, name, location, city, image_url, is_active, status')
            .in('id', salonIds);

          if (salonsError) {
            console.error('Error fetching salons:', salonsError);
            setOwnedSalons([]);
            return;
          }

          const salons = (salonsData || []).map((salon: any) => {
            const ownership = ownershipData.find((o) => o.salon_id === salon.id);
            return {
              ...salon,
              is_primary: ownership?.is_primary || false,
            };
          });

          setOwnedSalons(salons);
          return;
        }

        // 2) Role-only: allow owner flows even before salon_owners row exists
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'salon_owner')
          .maybeSingle();

        if (roleData) {
          setIsSalonOwner(true);
          setOwnedSalons([]);
          setHasOwnership(false);
          return;
        }

        setIsSalonOwner(false);
        setOwnedSalons([]);
        setHasOwnership(false);
      } catch (err) {
        console.error('Error checking salon ownership:', err);
        setIsSalonOwner(false);
        setOwnedSalons([]);
        setHasOwnership(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSalonOwnership();
  }, [user]);

  return { isSalonOwner, ownedSalons, hasOwnership, isLoading };
};

export default useSalonOwner;