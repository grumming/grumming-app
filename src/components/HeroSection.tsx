import { motion } from "framer-motion";
import { Search, MapPin, Locate, Loader2, Scissors, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "@/contexts/LocationContext";
import { getFilteredCities } from "@/data/indianCities";
import { getFilteredSalons, SalonBasic } from "@/data/salonsData";
import { useRecentSearches } from "@/hooks/useRecentSearches";

const HeroSection = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedCity, setSelectedCity, isDetecting, detectLocation } = useLocation();
  const [locationInput, setLocationInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSalonSuggestions, setShowSalonSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [salonSuggestions, setSalonSuggestions] = useState<SalonBasic[]>([]);
  const locationInputRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLDivElement>(null);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();

  // Sync location input with selected city from context
  useEffect(() => {
    if (selectedCity) {
      setLocationInput(selectedCity);
    }
  }, [selectedCity]);

  useEffect(() => {
    const filtered = getFilteredCities(locationInput);
    setSuggestions(filtered);
  }, [locationInput]);

  useEffect(() => {
    const filtered = getFilteredSalons(searchQuery);
    setSalonSuggestions(filtered);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSalonSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDetectLocation = async () => {
    await detectLocation();
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationInput(e.target.value);
    setShowSuggestions(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSalonSuggestions(true);
  };

  const handleSelectSalon = (salon: SalonBasic) => {
    addRecentSearch(salon);
    setShowSalonSuggestions(false);
    navigate(`/salon/${salon.id}`);
  };

  const handleSelectCity = (city: string) => {
    setLocationInput(city);
    setSelectedCity(city);
    setShowSuggestions(false);
  };

  const handleSearch = () => {
    navigate('/search');
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
                    value={locationInput}
                    onChange={handleLocationChange}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Enter city name"
                    className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground font-body"
                  />
                  <button
                    onClick={handleDetectLocation}
                    disabled={isDetecting}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 flex-shrink-0"
                    title="Detect my location"
                  >
                    {isDetecting ? (
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
              
              {/* Search Input with Salon Suggestions */}
              <div ref={searchInputRef} className="relative flex-[2]">
                <div className="flex items-center gap-2 px-4 py-3 bg-background rounded-xl">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => setShowSalonSuggestions(true)}
                    placeholder="Search for salons, services..."
                    className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground font-body"
                  />
                </div>

                {/* Salon Suggestions Dropdown */}
                {showSalonSuggestions && (salonSuggestions.length > 0 || (searchQuery === '' && recentSearches.length > 0)) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto">
                    {/* Recent Searches */}
                    {searchQuery === '' && recentSearches.length > 0 && (
                      <>
                        <div className="px-4 py-2 flex items-center justify-between border-b border-border">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Recent Searches
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearRecentSearches();
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                        {recentSearches.map((salon) => (
                          <button
                            key={salon.id}
                            onClick={() => handleSelectSalon(salon)}
                            className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3"
                          >
                            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div>
                              <p className="text-foreground font-medium">{salon.name}</p>
                              <p className="text-xs text-muted-foreground">{salon.location}, {salon.city}</p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    {/* Search Suggestions */}
                    {salonSuggestions.map((salon) => (
                      <button
                        key={salon.id}
                        onClick={() => handleSelectSalon(salon)}
                        className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl"
                      >
                        <Scissors className="w-4 h-4 text-primary flex-shrink-0" />
                        <div>
                          <p className="text-foreground font-medium">{salon.name}</p>
                          <p className="text-xs text-muted-foreground">{salon.location}, {salon.city}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Search Button */}
              <Button variant="hero" size="lg" className="sm:px-8" onClick={handleSearch}>
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
