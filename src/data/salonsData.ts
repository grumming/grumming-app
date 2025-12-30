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

export const allSalonsList: SalonBasic[] = [
  // Mumbai
  { id: 1, name: "Luxe Beauty Lounge", location: "Bandra West", city: "Mumbai", image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100&h=100&fit=crop" },
  { id: 2, name: "Glow Studio", location: "Andheri East", city: "Mumbai", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100&h=100&fit=crop" },
  { id: 3, name: "The Hair Bar", location: "Juhu", city: "Mumbai", image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=100&h=100&fit=crop" },
  { id: 4, name: "Serenity Spa", location: "Powai", city: "Mumbai", image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=100&h=100&fit=crop" },
  // Bihar - Patna
  { id: 5, name: "Royal Cuts Salon", location: "Boring Road", city: "Patna", image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=100&h=100&fit=crop" },
  { id: 6, name: "Glamour Zone", location: "Fraser Road", city: "Patna", image: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=100&h=100&fit=crop" },
  { id: 7, name: "Style Studio Patna", location: "Kankarbagh", city: "Patna", image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=100&h=100&fit=crop" },
  { id: 14, name: "The Grooming Lounge", location: "Patliputra Colony", city: "Patna", image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=100&h=100&fit=crop" },
  // Bihar - Gaya
  { id: 8, name: "Buddha Beauty Parlour", location: "Bodhgaya Road", city: "Gaya", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100&h=100&fit=crop" },
  { id: 9, name: "Gaya Men's Salon", location: "Station Road", city: "Gaya", image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=100&h=100&fit=crop" },
  // Bihar - Muzaffarpur
  { id: 10, name: "Lichi City Salon", location: "Saraiya Ganj", city: "Muzaffarpur", image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100&h=100&fit=crop" },
  { id: 11, name: "New Look Unisex Salon", location: "Mithanpura", city: "Muzaffarpur", image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=100&h=100&fit=crop" },
  // Bihar - Bhagalpur
  { id: 12, name: "Silk City Beauty Hub", location: "Khalifabagh", city: "Bhagalpur", image: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=100&h=100&fit=crop" },
  { id: 13, name: "Trendy Looks Bhagalpur", location: "Adampur", city: "Bhagalpur", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100&h=100&fit=crop" },
  // Bihar - Chakia
  { id: 15, name: "Expert Hair and Skin Salon", location: "Main Road", city: "Chakia", image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100&h=100&fit=crop" },
];

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

// All services from salons for search
const allServicesData: ServiceData[] = [
  // Luxe Beauty Lounge
  { salonId: 1, salonName: "Luxe Beauty Lounge", serviceName: "Haircut & Styling", price: 49, duration: "45 min", category: "Hair", location: "Bandra West", city: "Mumbai" },
  { salonId: 1, salonName: "Luxe Beauty Lounge", serviceName: "Hair Coloring", price: 49, duration: "2 hrs", category: "Hair", location: "Bandra West", city: "Mumbai" },
  { salonId: 1, salonName: "Luxe Beauty Lounge", serviceName: "Keratin Treatment", price: 49, duration: "3 hrs", category: "Hair", location: "Bandra West", city: "Mumbai" },
  { salonId: 1, salonName: "Luxe Beauty Lounge", serviceName: "Bridal Makeup", price: 49, duration: "2 hrs", category: "Makeup", location: "Bandra West", city: "Mumbai" },
  { salonId: 1, salonName: "Luxe Beauty Lounge", serviceName: "Party Makeup", price: 49, duration: "1 hr", category: "Makeup", location: "Bandra West", city: "Mumbai" },
  { salonId: 1, salonName: "Luxe Beauty Lounge", serviceName: "Full Body Massage", price: 49, duration: "1.5 hrs", category: "Spa", location: "Bandra West", city: "Mumbai" },
  { salonId: 1, salonName: "Luxe Beauty Lounge", serviceName: "Facial Treatment", price: 49, duration: "1 hr", category: "Spa", location: "Bandra West", city: "Mumbai" },
  { salonId: 1, salonName: "Luxe Beauty Lounge", serviceName: "Manicure & Pedicure", price: 49, duration: "1.5 hrs", category: "Nails", location: "Bandra West", city: "Mumbai" },
  // Glow Studio
  { salonId: 2, salonName: "Glow Studio", serviceName: "Classic Facial", price: 49, duration: "1 hr", category: "Skincare", location: "Andheri East", city: "Mumbai" },
  { salonId: 2, salonName: "Glow Studio", serviceName: "Gold Facial", price: 49, duration: "1.5 hrs", category: "Skincare", location: "Andheri East", city: "Mumbai" },
  { salonId: 2, salonName: "Glow Studio", serviceName: "Chemical Peel", price: 49, duration: "45 min", category: "Skincare", location: "Andheri East", city: "Mumbai" },
  { salonId: 2, salonName: "Glow Studio", serviceName: "Full Body Waxing", price: 49, duration: "1.5 hrs", category: "Waxing", location: "Andheri East", city: "Mumbai" },
  { salonId: 2, salonName: "Glow Studio", serviceName: "Threading", price: 49, duration: "15 min", category: "Threading", location: "Andheri East", city: "Mumbai" },
  // The Hair Bar
  { salonId: 3, salonName: "The Hair Bar", serviceName: "Men's Haircut", price: 49, duration: "30 min", category: "Haircut", location: "Juhu", city: "Mumbai" },
  { salonId: 3, salonName: "The Hair Bar", serviceName: "Women's Haircut", price: 49, duration: "45 min", category: "Haircut", location: "Juhu", city: "Mumbai" },
  { salonId: 3, salonName: "The Hair Bar", serviceName: "Balayage", price: 49, duration: "3 hrs", category: "Color", location: "Juhu", city: "Mumbai" },
  { salonId: 3, salonName: "The Hair Bar", serviceName: "Highlights", price: 49, duration: "2 hrs", category: "Color", location: "Juhu", city: "Mumbai" },
  { salonId: 3, salonName: "The Hair Bar", serviceName: "Hair Spa", price: 49, duration: "1 hr", category: "Treatment", location: "Juhu", city: "Mumbai" },
  // Serenity Spa
  { salonId: 4, salonName: "Serenity Spa", serviceName: "Swedish Massage", price: 49, duration: "1 hr", category: "Massage", location: "Powai", city: "Mumbai" },
  { salonId: 4, salonName: "Serenity Spa", serviceName: "Deep Tissue Massage", price: 49, duration: "1 hr", category: "Massage", location: "Powai", city: "Mumbai" },
  { salonId: 4, salonName: "Serenity Spa", serviceName: "Hot Stone Therapy", price: 49, duration: "1.5 hrs", category: "Massage", location: "Powai", city: "Mumbai" },
  { salonId: 4, salonName: "Serenity Spa", serviceName: "Body Wrap", price: 49, duration: "1 hr", category: "Body", location: "Powai", city: "Mumbai" },
  { salonId: 4, salonName: "Serenity Spa", serviceName: "Aromatherapy", price: 49, duration: "1.5 hrs", category: "Aromatherapy", location: "Powai", city: "Mumbai" },
  // Royal Cuts Salon
  { salonId: 5, salonName: "Royal Cuts Salon", serviceName: "Men's Haircut", price: 150, duration: "30 min", category: "Haircut", location: "Boring Road", city: "Patna" },
  { salonId: 5, salonName: "Royal Cuts Salon", serviceName: "Women's Haircut", price: 250, duration: "45 min", category: "Haircut", location: "Boring Road", city: "Patna" },
  { salonId: 5, salonName: "Royal Cuts Salon", serviceName: "Hair Coloring", price: 800, duration: "2 hrs", category: "Hair", location: "Boring Road", city: "Patna" },
  { salonId: 5, salonName: "Royal Cuts Salon", serviceName: "Beard Styling", price: 100, duration: "20 min", category: "Grooming", location: "Boring Road", city: "Patna" },
  { salonId: 5, salonName: "Royal Cuts Salon", serviceName: "Hair Spa", price: 500, duration: "1 hr", category: "Treatment", location: "Boring Road", city: "Patna" },
  { salonId: 5, salonName: "Royal Cuts Salon", serviceName: "Facial", price: 400, duration: "45 min", category: "Skincare", location: "Boring Road", city: "Patna" },
  { salonId: 5, salonName: "Royal Cuts Salon", serviceName: "Head Massage", price: 200, duration: "30 min", category: "Massage", location: "Boring Road", city: "Patna" },
  // Glamour Zone
  { salonId: 6, salonName: "Glamour Zone", serviceName: "Bridal Makeup", price: 8000, duration: "3 hrs", category: "Makeup", location: "Fraser Road", city: "Patna" },
  { salonId: 6, salonName: "Glamour Zone", serviceName: "Party Makeup", price: 2000, duration: "1.5 hrs", category: "Makeup", location: "Fraser Road", city: "Patna" },
  { salonId: 6, salonName: "Glamour Zone", serviceName: "Gold Facial", price: 800, duration: "1 hr", category: "Skincare", location: "Fraser Road", city: "Patna" },
  { salonId: 6, salonName: "Glamour Zone", serviceName: "Diamond Facial", price: 1200, duration: "1.5 hrs", category: "Skincare", location: "Fraser Road", city: "Patna" },
  { salonId: 6, salonName: "Glamour Zone", serviceName: "Full Body Waxing", price: 1500, duration: "2 hrs", category: "Waxing", location: "Fraser Road", city: "Patna" },
  { salonId: 6, salonName: "Glamour Zone", serviceName: "Mehendi", price: 1000, duration: "2 hrs", category: "Bridal", location: "Fraser Road", city: "Patna" },
  { salonId: 6, salonName: "Glamour Zone", serviceName: "Nail Art", price: 500, duration: "1 hr", category: "Nails", location: "Fraser Road", city: "Patna" },
  // Style Studio Patna
  { salonId: 7, salonName: "Style Studio Patna", serviceName: "Haircut & Styling", price: 200, duration: "45 min", category: "Hair", location: "Kankarbagh", city: "Patna" },
  { salonId: 7, salonName: "Style Studio Patna", serviceName: "Hair Straightening", price: 1500, duration: "2 hrs", category: "Hair", location: "Kankarbagh", city: "Patna" },
  { salonId: 7, salonName: "Style Studio Patna", serviceName: "Threading", price: 30, duration: "15 min", category: "Threading", location: "Kankarbagh", city: "Patna" },
  { salonId: 7, salonName: "Style Studio Patna", serviceName: "Basic Facial", price: 300, duration: "45 min", category: "Skincare", location: "Kankarbagh", city: "Patna" },
  { salonId: 7, salonName: "Style Studio Patna", serviceName: "Manicure", price: 200, duration: "30 min", category: "Nails", location: "Kankarbagh", city: "Patna" },
  { salonId: 7, salonName: "Style Studio Patna", serviceName: "Pedicure", price: 300, duration: "45 min", category: "Nails", location: "Kankarbagh", city: "Patna" },
  // Buddha Beauty Parlour
  { salonId: 8, salonName: "Buddha Beauty Parlour", serviceName: "Women's Haircut", price: 180, duration: "40 min", category: "Haircut", location: "Bodhgaya Road", city: "Gaya" },
  { salonId: 8, salonName: "Buddha Beauty Parlour", serviceName: "Traditional Facial", price: 350, duration: "1 hr", category: "Skincare", location: "Bodhgaya Road", city: "Gaya" },
  { salonId: 8, salonName: "Buddha Beauty Parlour", serviceName: "Herbal Hair Treatment", price: 600, duration: "1.5 hrs", category: "Hair", location: "Bodhgaya Road", city: "Gaya" },
  { salonId: 8, salonName: "Buddha Beauty Parlour", serviceName: "Bridal Package", price: 5000, duration: "4 hrs", category: "Bridal", location: "Bodhgaya Road", city: "Gaya" },
  { salonId: 8, salonName: "Buddha Beauty Parlour", serviceName: "Mehendi Design", price: 500, duration: "1.5 hrs", category: "Bridal", location: "Bodhgaya Road", city: "Gaya" },
  // Gaya Men's Salon
  { salonId: 9, salonName: "Gaya Men's Salon", serviceName: "Haircut", price: 100, duration: "25 min", category: "Haircut", location: "Station Road", city: "Gaya" },
  { salonId: 9, salonName: "Gaya Men's Salon", serviceName: "Shave", price: 80, duration: "20 min", category: "Grooming", location: "Station Road", city: "Gaya" },
  { salonId: 9, salonName: "Gaya Men's Salon", serviceName: "Beard Trim", price: 60, duration: "15 min", category: "Grooming", location: "Station Road", city: "Gaya" },
  { salonId: 9, salonName: "Gaya Men's Salon", serviceName: "Hair Color", price: 300, duration: "1 hr", category: "Hair", location: "Station Road", city: "Gaya" },
  { salonId: 9, salonName: "Gaya Men's Salon", serviceName: "Face Massage", price: 150, duration: "20 min", category: "Massage", location: "Station Road", city: "Gaya" },
  { salonId: 9, salonName: "Gaya Men's Salon", serviceName: "Head Massage", price: 120, duration: "25 min", category: "Massage", location: "Station Road", city: "Gaya" },
];

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
