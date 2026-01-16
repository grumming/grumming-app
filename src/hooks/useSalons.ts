import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryConfig, queryKeys } from '@/lib/queryConfig';

export interface DbSalon {
  id: string;
  name: string;
  location: string;
  city: string;
  image_url: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  rating: number;
  total_reviews: number;
  is_active: boolean;
  opening_time: string | null;
  closing_time: string | null;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  amenities: string[] | null;
}

export interface SalonWithDistance extends DbSalon {
  distance?: number; // in km
}

export interface DbSalonService {
  id: string;
  salon_id: string;
  name: string;
  price: number;
  duration: string;
  category: string;
  description: string | null;
  is_active: boolean;
}

export interface SalonWithServices extends DbSalon {
  services: DbSalonService[];
}

// Fetch all active salons with React Query caching
const fetchAllSalons = async (): Promise<DbSalon[]> => {
  const { data, error } = await supabase
    .from('salons_public')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'approved')
    .order('rating', { ascending: false });

  if (error) throw error;
  return (data || []) as DbSalon[];
};

export const useSalons = () => {
  const { data: salons = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.salons.all,
    queryFn: fetchAllSalons,
    staleTime: queryConfig.staleTime.salons,
    gcTime: queryConfig.gcTime.salons,
  });

  return { 
    salons, 
    isLoading, 
    error: error?.message || null, 
    refetch 
  };
};

// Fetch salon by ID with services
const fetchSalonById = async (id: string): Promise<SalonWithServices | null> => {
  const { data: salonData, error: salonError } = await supabase
    .from('salons_public')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (salonError) throw salonError;
  if (!salonData) return null;

  const { data: servicesData, error: servicesError } = await supabase
    .from('salon_services')
    .select('*')
    .eq('salon_id', id)
    .eq('is_active', true)
    .order('category', { ascending: true });

  if (servicesError) throw servicesError;

  return {
    ...salonData,
    services: servicesData || []
  } as SalonWithServices;
};

export const useSalonById = (salonId: string | undefined) => {
  const { data: salon = null, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.salons.byId(salonId || ''),
    queryFn: () => fetchSalonById(salonId!),
    enabled: !!salonId,
    staleTime: queryConfig.staleTime.salonById,
  });

  return { 
    salon, 
    isLoading, 
    error: error ? (salon === null && !isLoading ? 'Salon not found' : error.message) : null, 
    refetch: () => refetch() 
  };
};

// Fetch salons by city
const fetchSalonsByCity = async (city: string | null): Promise<DbSalon[]> => {
  let query = supabase
    .from('salons_public')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'approved')
    .order('rating', { ascending: false });

  if (city) {
    const cityName = city.split(',')[0].trim();
    query = query.ilike('city', `%${cityName}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as DbSalon[];
};

export const useSalonsByCity = (city: string | null) => {
  const { data: salons = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.salons.byCity(city),
    queryFn: () => fetchSalonsByCity(city),
    staleTime: queryConfig.staleTime.salons,
    gcTime: queryConfig.gcTime.salons,
  });

  return { 
    salons, 
    isLoading, 
    error: error?.message || null, 
    refetch 
  };
};

// Search salons and services from database
export interface SearchResult {
  salons: DbSalon[];
  services: Array<DbSalonService & { salon_name: string; salon_city: string }>;
}

const searchSalonsAndServices = async (query: string): Promise<SearchResult> => {
  if (!query || query.length < 2) {
    return { salons: [], services: [] };
  }

  const searchTerm = `%${query}%`;

  // Search salons
  const { data: salons, error: salonsError } = await supabase
    .from('salons_public')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'approved')
    .or(`name.ilike.${searchTerm},location.ilike.${searchTerm},city.ilike.${searchTerm}`)
    .limit(10);

  if (salonsError) throw salonsError;

  // Search services with salon info
  const { data: services, error: servicesError } = await supabase
    .from('salon_services')
    .select(`
      *,
      salons!inner(name, city, is_active, status)
    `)
    .eq('is_active', true)
    .eq('salons.is_active', true)
    .eq('salons.status', 'approved')
    .or(`name.ilike.${searchTerm},category.ilike.${searchTerm}`)
    .limit(10);

  if (servicesError) throw servicesError;

  return {
    salons: (salons || []) as DbSalon[],
    services: (services || []).map((s: any) => ({
      ...s,
      salon_name: s.salons?.name || '',
      salon_city: s.salons?.city || '',
    })),
  };
};

export const useSearchSalons = (query: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.salons.search(query),
    queryFn: () => searchSalonsAndServices(query),
    enabled: query.length >= 2,
    staleTime: queryConfig.staleTime.salons,
  });

  return {
    salons: data?.salons || [],
    services: data?.services || [],
    isLoading,
    error: error?.message || null,
  };
};
