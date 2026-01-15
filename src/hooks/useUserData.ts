import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_STALE_TIMES, QUERY_KEYS, QUERY_GC_TIMES } from '@/lib/queryConfig';

interface OwnedSalon {
  id: string;
  name: string;
  location: string;
  city: string;
  image_url: string | null;
  is_active: boolean | null;
  is_primary: boolean;
  status?: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  email_verified: boolean | null;
  is_banned: boolean | null;
}

interface UserData {
  profile: UserProfile | null;
  roles: string[];
  isAdmin: boolean;
  isSalonOwner: boolean;
  ownedSalons: OwnedSalon[];
  hasOwnership: boolean;
}

async function fetchUserData(userId: string): Promise<UserData> {
  // Parallel fetch of all user-related data in ONE batch request
  const [profileRes, rolesRes, ownershipRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, user_id, full_name, email, phone, avatar_url, email_verified, is_banned')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId),
    supabase
      .from('salon_owners')
      .select(`
        salon_id,
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
      .eq('user_id', userId)
  ]);

  const roles = rolesRes.data?.map(r => r.role) || [];
  
  // Map owned salons with their details
  const ownedSalons: OwnedSalon[] = (ownershipRes.data || [])
    .filter(record => record.salons)
    .map(record => {
      const salon = record.salons as {
        id: string;
        name: string;
        location: string;
        city: string;
        image_url: string | null;
        is_active: boolean | null;
        status?: string;
      };
      return {
        id: salon.id,
        name: salon.name,
        location: salon.location,
        city: salon.city,
        image_url: salon.image_url,
        is_active: salon.is_active,
        is_primary: record.is_primary || false,
        status: salon.status,
      };
    });

  return {
    profile: profileRes.data,
    roles,
    isAdmin: roles.includes('admin'),
    isSalonOwner: roles.includes('salon_owner') || ownedSalons.length > 0,
    ownedSalons,
    hasOwnership: ownedSalons.length > 0,
  };
}

export function useUserData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.userData(user?.id),
    queryFn: () => fetchUserData(user!.id),
    enabled: !!user,
    staleTime: QUERY_STALE_TIMES.userData,
    gcTime: QUERY_GC_TIMES.userRelated,
  });

  // Function to invalidate user data cache
  const invalidateUserData = () => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userData(user.id) });
    }
  };

  return {
    ...query,
    invalidateUserData,
  };
}

// Export for prefetching in auth context
export { fetchUserData };
