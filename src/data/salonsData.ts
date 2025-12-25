export interface SalonBasic {
  id: number;
  name: string;
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
