export interface SalonBasic {
  id: number;
  name: string;
  location: string;
  city: string;
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
}

export const allSalonsList: SalonBasic[] = [
  // Mumbai
  { id: 1, name: "Luxe Beauty Lounge", location: "Bandra West", city: "Mumbai" },
  { id: 2, name: "Glow Studio", location: "Andheri East", city: "Mumbai" },
  { id: 3, name: "The Hair Bar", location: "Juhu", city: "Mumbai" },
  { id: 4, name: "Serenity Spa", location: "Powai", city: "Mumbai" },
  // Bihar - Patna
  { id: 5, name: "Royal Cuts Salon", location: "Boring Road", city: "Patna" },
  { id: 6, name: "Glamour Zone", location: "Fraser Road", city: "Patna" },
  { id: 7, name: "Style Studio Patna", location: "Kankarbagh", city: "Patna" },
  { id: 14, name: "The Grooming Lounge", location: "Patliputra Colony", city: "Patna" },
  // Bihar - Gaya
  { id: 8, name: "Buddha Beauty Parlour", location: "Bodhgaya Road", city: "Gaya" },
  { id: 9, name: "Gaya Men's Salon", location: "Station Road", city: "Gaya" },
  // Bihar - Muzaffarpur
  { id: 10, name: "Lichi City Salon", location: "Saraiya Ganj", city: "Muzaffarpur" },
  { id: 11, name: "New Look Unisex Salon", location: "Mithanpura", city: "Muzaffarpur" },
  // Bihar - Bhagalpur
  { id: 12, name: "Silk City Beauty Hub", location: "Khalifabagh", city: "Bhagalpur" },
  { id: 13, name: "Trendy Looks Bhagalpur", location: "Adampur", city: "Bhagalpur" },
  // Bihar - Chakia
  { id: 15, name: "Expert Hair and Skin Salon", location: "Main Road", city: "Chakia" },
];

// All services from salons for search
const allServices: ServiceResult[] = [
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
  return allServices
    .filter(service => 
      service.serviceName.toLowerCase().includes(lowerQuery) ||
      service.category.toLowerCase().includes(lowerQuery)
    )
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
  
  const services = allServices
    .filter(service => 
      service.serviceName.toLowerCase().includes(lowerQuery) ||
      service.category.toLowerCase().includes(lowerQuery)
    )
    .slice(0, 4);
  
  return { salons, services };
};
