import { motion } from "framer-motion";
import { Star, MapPin, Clock, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const salons = [
  {
    id: 1,
    name: "Luxe Beauty Lounge",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
    rating: 4.9,
    reviews: 324,
    location: "Bandra West",
    distance: "1.2 km",
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
    location: "Andheri East",
    distance: "2.5 km",
    timing: "9 AM - 8 PM",
    services: ["Skincare", "Facial", "Waxing"],
    price: "₹₹",
  },
  {
    id: 3,
    name: "The Hair Bar",
    image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&auto=format&fit=crop&q=80",
    rating: 4.7,
    reviews: 189,
    location: "Juhu",
    distance: "3.1 km",
    timing: "11 AM - 10 PM",
    services: ["Haircut", "Color", "Treatment"],
    price: "₹₹₹₹",
  },
  {
    id: 4,
    name: "Serenity Spa",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=80",
    rating: 4.9,
    reviews: 412,
    location: "Powai",
    distance: "4.0 km",
    timing: "8 AM - 10 PM",
    services: ["Massage", "Body Wrap", "Aromatherapy"],
    price: "₹₹₹₹",
  },
];

const FeaturedSalons = () => {
  const [favorites, setFavorites] = useState<number[]>([]);

  const toggleFavorite = (id: number) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
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
              Featured Salons
            </h2>
            <p className="text-muted-foreground">
              Handpicked salons with the best ratings & reviews
            </p>
          </div>
          <Button variant="outline" className="mt-4 sm:mt-0">
            View All
          </Button>
        </motion.div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {salons.map((salon, index) => (
            <motion.div
              key={salon.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div className="group bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-1">
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={salon.image}
                    alt={salon.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <button
                    onClick={() => toggleFavorite(salon.id)}
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
                      <span>{salon.location} • {salon.distance}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{salon.timing}</span>
                    </div>
                  </div>
                  
                  <Button variant="default" className="w-full">
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
