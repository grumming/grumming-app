import { useState, useEffect } from 'react';
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

export const useSalons = () => {
  const [salons, setSalons] = useState<DbSalon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSalons();
  }, []);

  const fetchSalons = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('salons')
        .select('*')
        .eq('is_active', true)
        .eq('status', 'approved')
        .order('rating', { ascending: false });

      if (error) throw error;
      setSalons(data || []);
    } catch (err: any) {
      console.error('Error fetching salons:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { salons, isLoading, error, refetch: fetchSalons };
};

export const useSalonById = (salonId: string | undefined) => {
  const [salon, setSalon] = useState<SalonWithServices | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (salonId) {
      fetchSalon(salonId);
    }
  }, [salonId]);

  const fetchSalon = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Fetch salon
      const { data: salonData, error: salonError } = await supabase
        .from('salons')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (salonError) throw salonError;
      
      if (!salonData) {
        setError('Salon not found');
        setSalon(null);
        return;
      }

      // Fetch services for this salon
      const { data: servicesData, error: servicesError } = await supabase
        .from('salon_services')
        .select('*')
        .eq('salon_id', id)
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (servicesError) throw servicesError;

      setSalon({
        ...salonData,
        services: servicesData || []
      });
    } catch (err: any) {
      console.error('Error fetching salon:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { salon, isLoading, error, refetch: () => salonId && fetchSalon(salonId) };
};

export const useSalonsByCity = (city: string | null) => {
  const [salons, setSalons] = useState<DbSalon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSalons();
  }, [city]);

  const fetchSalons = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('salons')
        .select('*')
        .eq('is_active', true)
        .eq('status', 'approved')
        .order('rating', { ascending: false });

      if (city) {
        // Try to match city name (handle formats like "Mumbai, Maharashtra")
        const cityName = city.split(',')[0].trim();
        query = query.ilike('city', `%${cityName}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSalons(data || []);
    } catch (err: any) {
      console.error('Error fetching salons:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { salons, isLoading, error, refetch: fetchSalons };
};
