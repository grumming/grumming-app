import { motion } from "framer-motion";
import { Star, MapPin, Clock, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "@/contexts/LocationContext";
import { calculateDistance, formatDistance } from "@/lib/distance";

export interface Salon {
  id: number;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  location: string;
  city: string;
  coordinates: { lat: number; lng: number };
  timing: string;
  services: string[];
  price: string;
}

export const salonsData: Salon[] = [
  // Mumbai Salons
  {
    id: 1,
    name: "Luxe Beauty Lounge",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
    rating: 4.9,
    reviews: 324,
    location: "Bandra West, Mumbai",
    city: "Mumbai",
    coordinates: { lat: 19.0596, lng: 72.8295 },
    timing: "10 AM - 9 PM",
    services: ["Hair", "Makeup", "Spa"],
    price: "₹₹₹",
  },
  {
    id: 2,
    name: "Glow Studio",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
    rating: 4.8,
    reviews: 256,
    location: "Andheri East, Mumbai",
    city: "Mumbai",
    coordinates: { lat: 19.1136, lng: 72.8697 },
    timing: "9 AM - 8 PM",
    services: ["Skincare", "Facial", "Waxing"],
    price: "₹₹",
  },
  // Bihar - Patna Salons
  {
    id: 5,
    name: "Royal Cuts Salon",
    image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&auto=format&fit=crop&q=80",
    rating: 4.7,
    reviews: 289,
    location: "Boring Road, Patna",
    city: "Patna",
    coordinates: { lat: 25.6093, lng: 85.1376 },
    timing: "10 AM - 9 PM",
    services: ["Haircut", "Grooming", "Spa"],
    price: "₹₹",
  },
  {
    id: 6,
    name: "Glamour Zone",
    image: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&auto=format&fit=crop&q=80",
    rating: 4.8,
    reviews: 356,
    location: "Fraser Road, Patna",
    city: "Patna",
    coordinates: { lat: 25.6125, lng: 85.1418 },
    timing: "9 AM - 8 PM",
    services: ["Bridal", "Makeup", "Skincare"],
    price: "₹₹₹",
  },
  // Bihar - Muzaffarpur
  {
    id: 10,
    name: "Lichi City Salon",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
    rating: 4.7,
    reviews: 234,
    location: "Saraiya Ganj, Muzaffarpur",
    city: "Muzaffarpur",
    coordinates: { lat: 26.1209, lng: 85.3647 },
    timing: "10 AM - 8 PM",
    services: ["Hair", "Makeup", "Skincare"],
    price: "₹₹",
  },
  // Bihar - Bhagalpur
  {
    id: 12,
    name: "Silk City Beauty Hub",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80",
    rating: 4.6,
    reviews: 189,
    location: "Khalifabagh, Bhagalpur",
    city: "Bhagalpur",
    coordinates: { lat: 25.2425, lng: 87.0041 },
    timing: "10 AM - 8 PM",
    services: ["Hair", "Bridal", "Massage"],
    price: "₹₹₹",
  },
  // Bihar - Gaya
  {
    id: 8,
    name: "Buddha Beauty Parlour",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
    rating: 4.6,
    reviews: 145,
    location: "Bodhgaya Road, Gaya",
    city: "Gaya",
    coordinates: { lat: 24.7914, lng: 85.0002 },
    timing: "9 AM - 7 PM",
    services: ["Hair", "Facial", "Bridal"],
    price: "₹₹",
  },
  {
    id: 14,
    name: "The Grooming Lounge",
    image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80",
    rating: 4.8,
    reviews: 267,
    location: "Patliputra Colony, Patna",
    city: "Patna",
    coordinates: { lat: 25.6245, lng: 85.0948 },
    timing: "10 AM - 9 PM",
    services: ["Haircut", "Grooming", "Spa"],
    price: "₹₹₹",
  },
  // Bihar - Chakia
  {
    id: 15,
    name: "Expert Hair and Skin Salon",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
    rating: 4.8,
    reviews: 156,
    location: "Main Road, Chakia",
    city: "Chakia",
    coordinates: { lat: 26.4167, lng: 83.8833 },
    timing: "9 AM - 8 PM",
    services: ["Hair", "Skincare", "Makeup"],
    price: "₹₹",
  },
];

const FeaturedSalons = () => {
  const [favorites, setFavorites] = useState<number[]>([]);
  const navigate = useNavigate();
  const { coordinates } = useLocation();

  // Calculate distance and sort salons by proximity
  const sortedSalons = useMemo(() => {
    if (!coordinates) {
      return salonsData.map(salon => ({ ...salon, distance: null }));
    }

    return salonsData
      .map(salon => ({
        ...salon,
        distance: calculateDistance(
          coordinates.lat,
          coordinates.lng,
          salon.coordinates.lat,
          salon.coordinates.lng
        ),
      }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [coordinates]);

  const toggleFavorite = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSalonClick = (id: number) => {
    navigate(`/salon/${id}`);
  };

  return (
    <section className="py-16 px-4 bg-secondary/30">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between mb-10"
        >
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              {coordinates ? "Nearby Salons" : "Featured Salons"}
            </h2>
            <p className="text-muted-foreground">
              {coordinates 
                ? "Sorted by distance from your location" 
                : "Handpicked salons with the best ratings & reviews"}
            </p>
          </div>
          <Button variant="outline" className="mt-4 sm:mt-0">
            View All
          </Button>
        </motion.div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sortedSalons.map((salon, index) => (
            <motion.div
              key={salon.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div 
                onClick={() => handleSalonClick(salon.id)}
                className="group bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={salon.image}
                    alt={salon.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <button
                    onClick={(e) => toggleFavorite(salon.id, e)}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
                  >
                    <Heart
                      className={`w-5 h-5 transition-colors ${
                        favorites.includes(salon.id)
                          ? "fill-primary text-primary"
                          : "text-foreground"
                      }`}
                    />
                  </button>
                  <div className="absolute bottom-3 left-3 flex gap-1">
                    {salon.services.map((service) => (
                      <span
                        key={service}
                        className="px-2 py-1 rounded-full bg-card/80 backdrop-blur-sm text-xs font-medium text-foreground"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-display font-semibold text-lg text-foreground">
                      {salon.name}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {salon.price}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 mb-3">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {salon.rating}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({salon.reviews} reviews)
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {salon.location}
                        {salon.distance !== null && ` • ${formatDistance(salon.distance)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{salon.timing}</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="default" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSalonClick(salon.id);
                    }}
                  >
                    Book Now
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedSalons;
