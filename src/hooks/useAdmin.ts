import { useUserData } from './useUserData';

export const useAdmin = () => {
  const { data, isLoading } = useUserData();
  
  return { 
    isAdmin: data?.isAdmin || false, 
    isLoading 
  };
};
