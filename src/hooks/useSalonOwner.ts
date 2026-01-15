import { useUserData } from './useUserData';

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

export const useSalonOwner = () => {
  const { data, isLoading } = useUserData();
  
  return {
    isSalonOwner: data?.isSalonOwner || false,
    ownedSalons: (data?.ownedSalons || []) as OwnedSalon[],
    hasOwnership: data?.hasOwnership || false,
    isLoading
  };
};

export default useSalonOwner;
