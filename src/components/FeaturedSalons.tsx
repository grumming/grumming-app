import { motion } from "framer-motion";
import { Star, MapPin, Clock, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "@/contexts/LocationContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useSalons, SalonWithDistance } from "@/hooks/useSalons";
import { calculateDistance, formatDistance } from "@/lib/distance";

const formatTime = (time: string | null): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}${minutes !== '00' ? ':' + minutes : ''} ${ampm}`;
};

const FeaturedSalons = () => {
  const navigate = useNavigate();
  const { selectedCity, coordinates } = useLocation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { salons, isLoading, error } = useSalons();

  // Filter salons by selected city and calculate distance, then sort
  const filteredSalons = useMemo(() => {
    if (!selectedCity) {
      // If no city selected, just add distance if we have coordinates
      return salons.map(salon => {
        const salonWithDistance: SalonWithDistance = { ...salon };
        if (coordinates && salon.latitude && salon.longitude) {
          salonWithDistance.distance = calculateDistance(
            coordinates.lat,
            coordinates.lng,
            salon.latitude,
            salon.longitude
          );
        }
        return salonWithDistance;
      }).sort((a, b) => {
        // Sort by distance if available, otherwise by rating
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return (b.rating || 0) - (a.rating || 0);
      });
    }
    
    const cityName = selectedCity.split(',')[0].trim().toLowerCase();
    const cityMatches = salons.filter(salon => 
      salon.city.toLowerCase().includes(cityName) ||
      cityName.includes(salon.city.toLowerCase())
    );
    
    // Use matched salons or all if no matches
    const baseSalons = cityMatches.length > 0 ? cityMatches : salons;
    
    // Calculate distance and sort
    return baseSalons.map(salon => {
      const salonWithDistance: SalonWithDistance = { ...salon };
      if (coordinates && salon.latitude && salon.longitude) {
        salonWithDistance.distance = calculateDistance(
          coordinates.lat,
          coordinates.lng,
          salon.latitude,
          salon.longitude
        );
      }
      return salonWithDistance;
    }).sort((a, b) => {
      // Sort by distance if available, otherwise by rating
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return (b.rating || 0) - (a.rating || 0);
    });
  }, [salons, selectedCity, coordinates]);

  const handleSalonClick = (id: string) => {
    navigate(`/salon/${id}`);
  };

  if (isLoading) {
    return (
      <section className="py-16 px-4 bg-secondary/30">
        <div className="container mx-auto flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 px-4 bg-secondary/30">
        <div className="container mx-auto text-center py-12">
          <p className="text-muted-foreground">Failed to load salons</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-secondary/30">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4"
        >
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              {selectedCity ? `Salons in ${selectedCity.split(',')[0]}` : "Featured Salons"}
            </h2>
            <p className="text-muted-foreground">
              {filteredSalons.length > 0 
                ? `Showing ${filteredSalons.length} salon${filteredSalons.length !== 1 ? 's' : ''}`
                : "No salons found in this area"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={() => navigate('/search')}
            >
              View All
            </Button>
          </div>
        </motion.div>
        
        {filteredSalons.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No salons found</h3>
            <p className="text-muted-foreground mb-4">
              No salons available in {selectedCity || 'your area'} yet.
            </p>
            <Button variant="outline" onClick={() => navigate('/search')}>
              Browse all salons
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredSalons.map((salon, index) => (
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
                    src={salon.image_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80"}
                    alt={salon.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <button
                    onClick={(e) => toggleFavorite(salon.id, e)}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
                  >
                    <Heart
                      className={`w-5 h-5 transition-colors ${
                        isFavorite(salon.id)
                          ? "fill-primary text-primary"
                          : "text-foreground"
                      }`}
                    />
                  </button>
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-display font-semibold text-lg text-foreground">
                      {salon.name}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-1 mb-3">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {salon.rating?.toFixed(1) || '4.5'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({salon.total_reviews || 0} reviews)
                    </span>
                  </div>
                  
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {salon.distance !== undefined 
                            ? `${formatDistance(salon.distance)} · ${salon.location}`
                            : `${salon.location}, ${salon.city}`
                          }
                        </span>
                      </div>
                    {salon.opening_time && salon.closing_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(salon.opening_time)} - {formatTime(salon.closing_time)}</span>
                      </div>
                    )}
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
        )}
      </div>
    </section>
  );
};

export default FeaturedSalons;