import { motion } from "framer-motion";
import { MapPin, Locate, Loader2, ChevronDown, Search, Clock, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import UserMenu from "@/components/UserMenu";
import NotificationCenter from "@/components/NotificationCenter";
import SearchModal from "@/components/SearchModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "@/contexts/LocationContext";
import { popularCities } from "@/data/indianCities";
import { useRecentCities } from "@/hooks/useRecentCities";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

interface MapboxSuggestion {
  city: string;
  state: string;
  coordinates: { latitude: number; longitude: number };
}

interface GroupedMapboxSuggestion {
  state: string;
  cities: { city: string; coordinates: { latitude: number; longitude: number } }[];
}

const Header = () => {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const { selectedCity, setSelectedCity, isDetecting, detectLocation } = useLocation();
  const { recentCities, addRecentCity, clearRecentCities } = useRecentCities();
  const [locationInput, setLocationInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [groupedSuggestions, setGroupedSuggestions] = useState<GroupedMapboxSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);
  const locationInputRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedCity) {
      setLocationInput(selectedCity);
    }
  }, [selectedCity]);

  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Only search with Mapbox when input is >= 2 chars
    if (locationInput.length >= 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('places-autocomplete', {
            body: { query: locationInput, country: 'in', limit: 10 }
          });
          
          if (error) {
            console.error('Places autocomplete error:', error);
            setGroupedSuggestions([]);
          } else {
            setGroupedSuggestions(data.grouped || []);
          }
        } catch (err) {
          console.error('Failed to fetch suggestions:', err);
          setGroupedSuggestions([]);
        }
        setIsSearching(false);
      }, 300);
    } else {
      setGroupedSuggestions([]);
      setIsSearching(false);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [locationInput]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      setIsScrolled(currentScrollY > 10);
      
      // Hide header when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }
      
      lastScrollY.current = currentScrollY;
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDetectLocation = async () => {
    await detectLocation({ forceFresh: true });
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationInput(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelectCity = (city: string, state: string, coordinates?: { latitude: number; longitude: number }) => {
    const fullCity = `${city}, ${state}`;
    setLocationInput(fullCity);
    setSelectedCity(fullCity);
    addRecentCity(fullCity);
    setShowSuggestions(false);
  };

  const handleSelectPopularCity = (city: string) => {
    setLocationInput(city);
    setSelectedCity(city);
    addRecentCity(city);
    setShowSuggestions(false);
  };

  const handleSelectRecentCity = (city: string) => {
    setLocationInput(city);
    setSelectedCity(city);
    setShowSuggestions(false);
  };

  const showPopular = locationInput.length < 2;

  return (
    <motion.header
      initial={{ opacity: 0, y: -50 }}
      animate={{ 
        opacity: 1, 
        y: isHidden ? -100 : 0 
      }}
      transition={{ 
        duration: 0.3, 
        ease: [0.22, 1, 0.36, 1]
      }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm' 
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 h-14 flex items-center gap-3">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0 transition-all duration-300 hover:scale-105 hover:drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]">
          <img src={logo} alt="Grumming" className="w-8 h-8 rounded-lg" />
        </Link>
        
        {/* Location Selector */}
        <div ref={locationInputRef} className="relative">
          <button 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/40 rounded-full border border-border/40 cursor-pointer hover:bg-muted/60 transition-colors"
            onClick={() => setShowSuggestions(!showSuggestions)}
          >
            <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-xs text-foreground font-medium max-w-20 truncate">
              {locationInput.split(',')[0] || 'Location'}
            </span>
            <ChevronDown 
              className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${showSuggestions ? 'rotate-180' : ''}`} 
            />
          </button>
          
          {/* Hidden input for search within dropdown */}
          {showSuggestions && (
            <motion.input
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              type="text"
              value={locationInput}
              onChange={handleLocationChange}
              autoFocus
              placeholder="Search city..."
              className="absolute top-12 left-0 w-64 px-3 py-2 bg-card border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 z-[201] shadow-lg"
            />
          )}
          
          {/* City Suggestions Dropdown */}
          {showSuggestions && (
            <motion.div 
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-4 top-[6.5rem] bg-card border border-border rounded-xl shadow-2xl z-[200] max-h-64 overflow-y-auto min-w-64 w-72"
            >
              {/* Detect Location Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDetectLocation();
                }}
                disabled={isDetecting}
                className="w-full px-3 py-2.5 flex items-center gap-2 text-sm text-primary hover:bg-primary/10 transition-colors border-b border-border"
              >
                {isDetecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Locate className="w-4 h-4" />
                )}
                <span className="font-medium">Detect my location</span>
              </button>
              <div className="p-2">
                {/* Recent Cities */}
                {recentCities.length > 0 && showPopular && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mb-3"
                  >
                    <div className="px-3 py-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Recent
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearRecentCities();
                        }}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Clear
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      {recentCities.slice(0, 3).map((city, index) => (
                        <motion.button
                          key={city}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: 0.05 + index * 0.05 }}
                          onClick={() => handleSelectRecentCity(city)}
                          className="w-full px-3 py-2 text-left hover:bg-primary/10 rounded-lg transition-all duration-200 flex items-center gap-2 text-xs group"
                        >
                          <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground font-medium group-hover:text-primary transition-colors truncate">
                            {city.split(',')[0]}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                    <div className="border-b border-border my-2" />
                  </motion.div>
                )}

                {showPopular ? (
                  <>
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                      className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Popular Cities
                    </motion.div>
                    <div className="grid grid-cols-2 gap-1">
                      {popularCities.map((city, index) => (
                        <motion.button
                          key={city}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: 0.15 + index * 0.04 }}
                          onClick={() => handleSelectPopularCity(city)}
                          className="px-3 py-2 text-left hover:bg-primary/10 rounded-lg transition-all duration-200 flex items-center gap-2 text-xs group"
                        >
                          <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                          <span className="text-foreground font-body group-hover:text-primary transition-colors truncate">
                            {city.split(',')[0]}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </>
                ) : isSearching ? (
                  <div className="space-y-2 py-2">
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: i * 0.05 }}
                        className="px-3"
                      >
                        <Skeleton className="h-4 w-20 mb-2" />
                        <div className="space-y-1">
                          <Skeleton className="h-8 w-full rounded-lg" />
                          <Skeleton className="h-8 w-full rounded-lg" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : groupedSuggestions.length > 0 ? (
                  groupedSuggestions.map((group, groupIndex) => (
                    <motion.div 
                      key={group.state} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: groupIndex * 0.08 }}
                      className="mb-2 last:mb-0"
                    >
                      <motion.div 
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: 0.05 + groupIndex * 0.08 }}
                        className="px-3 py-1.5 text-xs font-semibold text-primary/80 uppercase tracking-wider bg-primary/5 rounded-md mb-1"
                      >
                        {group.state}
                      </motion.div>
                      {group.cities.map((cityData, cityIndex) => (
                        <motion.button
                          key={`${group.state}-${cityData.city}`}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: 0.1 + (groupIndex * 0.08) + (cityIndex * 0.04) }}
                          onClick={() => handleSelectCity(cityData.city, group.state, cityData.coordinates)}
                          className="w-full px-3 py-2 text-left hover:bg-primary/10 rounded-lg transition-all duration-200 flex items-center gap-2.5 text-sm group"
                        >
                          <div className="p-1 rounded-md bg-muted group-hover:bg-primary/20 transition-colors">
                            <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                          </div>
                          <span className="text-foreground font-body group-hover:text-primary transition-colors">
                            {cityData.city}
                          </span>
                        </motion.button>
                      ))}
                    </motion.div>
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    className="px-3 py-4 text-sm text-muted-foreground text-center"
                  >
                    No cities found
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Search Button */}
        <button
          onClick={() => setShowSearchModal(true)}
          className="ml-1 p-1.5 rounded-full hover:bg-muted/50 transition-all duration-200 hover:scale-110 active:scale-95"
          title="Search salons"
        >
          <Search className="w-[18px] h-[18px] text-muted-foreground hover:text-foreground transition-colors" />
        </button>
        
        <div className="flex-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <NotificationCenter />
          <div className="h-5 w-px bg-border/50" />
          <UserMenu />
        </div>
      </div>
      
      {/* Search Modal */}
      <SearchModal 
        isOpen={showSearchModal} 
        onClose={() => setShowSearchModal(false)} 
        onOpenLocationPicker={() => setShowSuggestions(true)}
      />
    </motion.header>
  );
};

export default Header;
