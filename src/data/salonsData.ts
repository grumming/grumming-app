export interface SalonBasic {
  id: string | number;
  name: string;
  location: string;
  city: string;
  image: string;
}

export interface ServiceResult {
  salonId: number;
  salonName: string;
  serviceName: string;
  price: number;
  duration: string;
  category: string;
  location: string;
  city: string;
  image: string;
}

// Service category images
const serviceImages: Record<string, string> = {
  Hair: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100&h=100&fit=crop",
  Haircut: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=100&h=100&fit=crop",
  Color: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100&h=100&fit=crop",
  Makeup: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=100&h=100&fit=crop",
  Spa: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=100&h=100&fit=crop",
  Massage: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=100&h=100&fit=crop",
  Skincare: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=100&h=100&fit=crop",
  Nails: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=100&h=100&fit=crop",
  Waxing: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=100&h=100&fit=crop",
  Threading: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100&h=100&fit=crop",
  Grooming: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=100&h=100&fit=crop",
  Treatment: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100&h=100&fit=crop",
  Bridal: "https://images.unsplash.com/photo-1519741497674-611481863552?w=100&h=100&fit=crop",
  Body: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=100&h=100&fit=crop",
  Aromatherapy: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=100&h=100&fit=crop",
};

const getServiceImage = (category: string): string => {
  return serviceImages[category] || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100&h=100&fit=crop";
};

// Static salon data removed - search now uses database only
export const allSalonsList: SalonBasic[] = [];

// Internal service type without image
interface ServiceData {
  salonId: number;
  salonName: string;
  serviceName: string;
  price: number;
  duration: string;
  category: string;
  location: string;
  city: string;
}

// Static service data removed - search now uses database only
const allServicesData: ServiceData[] = [];

export const getFilteredSalons = (query: string): SalonBasic[] => {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  return allSalonsList
    .filter(salon => 
      salon.name.toLowerCase().includes(lowerQuery) ||
      salon.location.toLowerCase().includes(lowerQuery) ||
      salon.city.toLowerCase().includes(lowerQuery)
    )
    .slice(0, 6);
};

export const getFilteredServices = (query: string): ServiceResult[] => {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  return allServicesData
    .filter(service => 
      service.serviceName.toLowerCase().includes(lowerQuery) ||
      service.category.toLowerCase().includes(lowerQuery)
    )
    .map(service => ({
      ...service,
      image: getServiceImage(service.category)
    }))
    .slice(0, 6);
};

export interface SearchResults {
  salons: SalonBasic[];
  services: ServiceResult[];
}

export const getSearchResults = (query: string): SearchResults => {
  if (!query || query.length < 2) return { salons: [], services: [] };
  
  const lowerQuery = query.toLowerCase();
  
  const salons = allSalonsList
    .filter(salon => 
      salon.name.toLowerCase().includes(lowerQuery) ||
      salon.location.toLowerCase().includes(lowerQuery) ||
      salon.city.toLowerCase().includes(lowerQuery)
    )
    .slice(0, 4);
  
  const services = allServicesData
    .filter(service => 
      service.serviceName.toLowerCase().includes(lowerQuery) ||
      service.category.toLowerCase().includes(lowerQuery)
    )
    .map(service => ({
      ...service,
      image: getServiceImage(service.category)
    }))
    .slice(0, 4);
  
  return { salons, services };
};
