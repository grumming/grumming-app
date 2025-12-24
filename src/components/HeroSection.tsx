import { motion } from "framer-motion";
import { Search, MapPin, Locate, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getFilteredCities } from "@/data/indianCities";

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("Mumbai, Maharashtra");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { loading: detectingLocation, detectLocation, location: detectedLocation } = useGeolocation();
  const locationInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (detectedLocation) {
      setLocation(detectedLocation);
    }
  }, [detectedLocation]);

  useEffect(() => {
    const filtered = getFilteredCities(location);
    setSuggestions(filtered);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDetectLocation = async () => {
    await detectLocation();
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelectCity = (city: string) => {
    setLocation(city);
    setShowSuggestions(false);
  };

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div 
        className="absolute inset-0 z-0"
        style={{ background: "var(--gradient-hero)" }}
      />
      
      {/* Decorative circles */}
      <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
      
      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 leading-tight">
            Book Your Perfect
            <span className="block gradient-text">Haircut</span>
          </h1>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10"
        >
          Discover top-rated salons & spas near you. Book appointments instantly with India's most trusted beauty platform.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          {/* Search Card */}
          <div className="glass rounded-2xl p-2 shadow-card">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Location Input with Autocomplete */}
              <div ref={locationInputRef} className="relative flex-1">
                <div className="flex items-center gap-2 px-4 py-3 bg-background rounded-xl">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                  <input
                    type="text"
                    value={location}
                    onChange={handleLocationChange}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Enter city name"
                    className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground font-body"
                  />
                  <button
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 flex-shrink-0"
                    title="Detect my location"
                  >
                    {detectingLocation ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : (
                      <Locate className="w-4 h-4 text-primary" />
                    )}
                  </button>
                </div>
                
                {/* City Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                    {suggestions.map((city, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectCity(city)}
                        className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-2 first:rounded-t-xl last:rounded-b-xl"
                      >
                        <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground font-body">{city}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Search Input */}
              <div className="flex items-center gap-2 px-4 py-3 bg-background rounded-xl flex-[2]">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for salons, services..."
                  className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground font-body"
                />
              </div>
              
              {/* Search Button */}
              <Button variant="hero" size="lg" className="sm:px-8">
                Search
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
