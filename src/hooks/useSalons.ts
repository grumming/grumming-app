import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

const fetchSalonsData = async (): Promise<DbSalon[]> => {
  const { data, error } = await supabase
    .from('salons_public')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'approved')
    .order('rating', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const useSalons = () => {
  const { data: salons = [], isLoading, error, refetch } = useQuery({
    queryKey: ['salons'],
    queryFn: fetchSalonsData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  return { 
    salons, 
    isLoading, 
    error: error?.message || null, 
    refetch 
  };
};

const fetchSalonByIdData = async (id: string): Promise<SalonWithServices | null> => {
  // Fetch salon using salons_public view
  const { data: salonData, error: salonError } = await supabase
    .from('salons_public')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (salonError) throw salonError;
  
  if (!salonData) {
    return null;
  }

  // Fetch services for this salon
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
  };
};

export const useSalonById = (salonId: string | undefined) => {
  const { data: salon, isLoading, error, refetch } = useQuery({
    queryKey: ['salon', salonId],
    queryFn: () => fetchSalonByIdData(salonId!),
    enabled: !!salonId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  return { 
    salon: salon ?? null, 
    isLoading, 
    error: error?.message || (salon === null && !isLoading ? 'Salon not found' : null), 
    refetch 
  };
};

const fetchSalonsByCityData = async (city: string | null): Promise<DbSalon[]> => {
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
  return data || [];
};

export const useSalonsByCity = (city: string | null) => {
  const { data: salons = [], isLoading, error, refetch } = useQuery({
    queryKey: ['salons', 'city', city],
    queryFn: () => fetchSalonsByCityData(city),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  return { 
    salons, 
    isLoading, 
    error: error?.message || null, 
    refetch 
  };
};
