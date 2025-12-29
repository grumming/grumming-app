// City center coordinates for major Indian cities
export const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  // Maharashtra
  "Mumbai": { lat: 19.0760, lng: 72.8777 },
  "Pune": { lat: 18.5204, lng: 73.8567 },
  "Nagpur": { lat: 21.1458, lng: 79.0882 },
  
  // Bihar
  "Patna": { lat: 25.5941, lng: 85.1376 },
  "Gaya": { lat: 24.7914, lng: 85.0002 },
  "Muzaffarpur": { lat: 26.1209, lng: 85.3647 },
  "Bhagalpur": { lat: 25.2425, lng: 87.0041 },
  "Chakia": { lat: 26.4167, lng: 83.8833 },
  "Purnia": { lat: 25.7771, lng: 87.4753 },
  "Darbhanga": { lat: 26.1542, lng: 85.8918 },
  "Bihar Sharif": { lat: 25.1982, lng: 85.5228 },
  "Arrah": { lat: 25.5565, lng: 84.6628 },
  "Begusarai": { lat: 25.4182, lng: 86.1272 },
  "Chapra": { lat: 25.7848, lng: 84.7370 },
  "Siwan": { lat: 26.2211, lng: 84.3590 },
  "Motihari": { lat: 26.6488, lng: 84.9158 },
  "Samastipur": { lat: 25.8625, lng: 85.7811 },
  
  // Delhi NCR
  "Delhi": { lat: 28.6139, lng: 77.2090 },
  "New Delhi": { lat: 28.6139, lng: 77.2090 },
  "Noida": { lat: 28.5355, lng: 77.3910 },
  "Gurgaon": { lat: 28.4595, lng: 77.0266 },
  "Gurugram": { lat: 28.4595, lng: 77.0266 },
  "Faridabad": { lat: 28.4089, lng: 77.3178 },
  "Ghaziabad": { lat: 28.6692, lng: 77.4538 },
  
  // Karnataka
  "Bangalore": { lat: 12.9716, lng: 77.5946 },
  "Bengaluru": { lat: 12.9716, lng: 77.5946 },
  "Mysore": { lat: 12.2958, lng: 76.6394 },
  "Mysuru": { lat: 12.2958, lng: 76.6394 },
  "Hubli": { lat: 15.3647, lng: 75.1240 },
  
  // Tamil Nadu
  "Chennai": { lat: 13.0827, lng: 80.2707 },
  "Coimbatore": { lat: 11.0168, lng: 76.9558 },
  "Madurai": { lat: 9.9252, lng: 78.1198 },
  
  // Telangana
  "Hyderabad": { lat: 17.3850, lng: 78.4867 },
  "Secunderabad": { lat: 17.4399, lng: 78.4983 },
  "Warangal": { lat: 17.9784, lng: 79.5941 },
  
  // West Bengal
  "Kolkata": { lat: 22.5726, lng: 88.3639 },
  "Howrah": { lat: 22.5958, lng: 88.2636 },
  "Durgapur": { lat: 23.5204, lng: 87.3119 },
  
  // Gujarat
  "Ahmedabad": { lat: 23.0225, lng: 72.5714 },
  "Surat": { lat: 21.1702, lng: 72.8311 },
  "Vadodara": { lat: 22.3072, lng: 73.1812 },
  "Rajkot": { lat: 22.3039, lng: 70.8022 },
  
  // Rajasthan
  "Jaipur": { lat: 26.9124, lng: 75.7873 },
  "Jodhpur": { lat: 26.2389, lng: 73.0243 },
  "Udaipur": { lat: 24.5854, lng: 73.7125 },
  
  // Uttar Pradesh
  "Lucknow": { lat: 26.8467, lng: 80.9462 },
  "Kanpur": { lat: 26.4499, lng: 80.3319 },
  "Varanasi": { lat: 25.3176, lng: 82.9739 },
  "Agra": { lat: 27.1767, lng: 78.0081 },
  "Prayagraj": { lat: 25.4358, lng: 81.8463 },
  "Allahabad": { lat: 25.4358, lng: 81.8463 },
  
  // Madhya Pradesh
  "Bhopal": { lat: 23.2599, lng: 77.4126 },
  "Indore": { lat: 22.7196, lng: 75.8577 },
  "Gwalior": { lat: 26.2183, lng: 78.1828 },
  
  // Kerala
  "Kochi": { lat: 9.9312, lng: 76.2673 },
  "Cochin": { lat: 9.9312, lng: 76.2673 },
  "Thiruvananthapuram": { lat: 8.5241, lng: 76.9366 },
  "Kozhikode": { lat: 11.2588, lng: 75.7804 },
  
  // Punjab
  "Chandigarh": { lat: 30.7333, lng: 76.7794 },
  "Ludhiana": { lat: 30.9010, lng: 75.8573 },
  "Amritsar": { lat: 31.6340, lng: 74.8723 },
  
  // Andhra Pradesh
  "Visakhapatnam": { lat: 17.6868, lng: 83.2185 },
  "Vijayawada": { lat: 16.5062, lng: 80.6480 },
  "Tirupati": { lat: 13.6288, lng: 79.4192 },
  
  // Odisha
  "Bhubaneswar": { lat: 20.2961, lng: 85.8245 },
  "Cuttack": { lat: 20.4625, lng: 85.8830 },
  
  // Jharkhand
  "Ranchi": { lat: 23.3441, lng: 85.3096 },
  "Jamshedpur": { lat: 22.8046, lng: 86.2029 },
  
  // Assam
  "Guwahati": { lat: 26.1445, lng: 91.7362 },
  
  // Uttarakhand
  "Dehradun": { lat: 30.3165, lng: 78.0322 },
  
  // Goa
  "Panaji": { lat: 15.4909, lng: 73.8278 },
  "Goa": { lat: 15.2993, lng: 74.1240 },
};

export const getCityCoordinates = (cityName: string): { lat: number; lng: number } | null => {
  // Extract just the city name from "City, State" format
  const city = cityName.split(',')[0].trim();
  
  // Try exact match first
  if (cityCoordinates[city]) {
    return cityCoordinates[city];
  }
  
  // Try case-insensitive match
  const lowerCity = city.toLowerCase();
  for (const [name, coords] of Object.entries(cityCoordinates)) {
    if (name.toLowerCase() === lowerCity) {
      return coords;
    }
  }
  
  return null;
};
