import { motion } from "framer-motion";
import { MapPin, Locate, Loader2, ChevronDown, Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import UserMenu from "@/components/UserMenu";
import NotificationCenter from "@/components/NotificationCenter";
import SearchModal from "@/components/SearchModal";
import { useLocation } from "@/contexts/LocationContext";
import { getGroupedFilteredCities, popularCities, GroupedCitySuggestion } from "@/data/indianCities";

const Header = () => {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const { selectedCity, setSelectedCity, isDetecting, detectLocation } = useLocation();
  const [locationInput, setLocationInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [groupedSuggestions, setGroupedSuggestions] = useState<GroupedCitySuggestion[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const locationInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedCity) {
      setLocationInput(selectedCity);
    }
  }, [selectedCity]);

  useEffect(() => {
    const grouped = getGroupedFilteredCities(locationInput);
    setGroupedSuggestions(grouped);
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
      setIsScrolled(window.scrollY > 10);
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

  const handleSelectCity = (city: string, state: string) => {
    const fullCity = `${city}, ${state}`;
    setLocationInput(fullCity);
    setSelectedCity(fullCity);
    setShowSuggestions(false);
  };

  const handleSelectPopularCity = (city: string) => {
    setLocationInput(city);
    setSelectedCity(city);
    setShowSuggestions(false);
  };

  const showPopular = locationInput.length < 2;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm' 
          : 'bg-background/50 backdrop-blur-sm'
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Location Selector */}
        <div ref={locationInputRef} className="relative">
          <div 
            className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => setShowSuggestions(true)}
          >
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <input
              type="text"
              value={locationInput}
              onChange={handleLocationChange}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Select city"
              className="bg-transparent outline-none w-24 sm:w-32 text-sm text-foreground placeholder:text-muted-foreground font-body"
            />
            <ChevronDown 
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showSuggestions ? 'rotate-180' : ''}`} 
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDetectLocation();
              }}
              disabled={isDetecting}
              className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-50 flex-shrink-0"
              title="Detect my location"
            >
              {isDetecting ? (
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              ) : (
                <Locate className="w-3.5 h-3.5 text-primary" />
              )}
            </button>
          </div>
          
          {/* City Suggestions Dropdown */}
          {showSuggestions && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed left-4 top-[4.5rem] bg-background border border-border rounded-xl shadow-2xl z-[200] max-h-80 overflow-y-auto min-w-64 w-72"
            >
              <div className="p-2">
                {showPopular ? (
                  <>
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Popular Cities
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {popularCities.map((city, index) => (
                        <motion.button
                          key={city}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.15, delay: index * 0.02 }}
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
                ) : groupedSuggestions.length > 0 ? (
                  groupedSuggestions.map((group, groupIndex) => (
                    <div key={group.state} className="mb-2 last:mb-0">
                      <div className="px-3 py-1.5 text-xs font-semibold text-primary/80 uppercase tracking-wider bg-primary/5 rounded-md mb-1">
                        {group.state}
                      </div>
                      {group.cities.map((city, cityIndex) => (
                        <motion.button
                          key={`${group.state}-${city}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15, delay: (groupIndex * 0.05) + (cityIndex * 0.02) }}
                          onClick={() => handleSelectCity(city, group.state)}
                          className="w-full px-3 py-2 text-left hover:bg-primary/10 rounded-lg transition-all duration-200 flex items-center gap-2.5 text-sm group"
                        >
                          <div className="p-1 rounded-md bg-muted group-hover:bg-primary/20 transition-colors">
                            <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                          </div>
                          <span className="text-foreground font-body group-hover:text-primary transition-colors">
                            {city}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                    No cities found
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Search Button */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="p-2 rounded-lg hover:bg-muted/70 transition-colors"
            title="Search salons"
          >
            <Search className="w-5 h-5 text-foreground" />
          </button>
          
          <NotificationCenter />
          <UserMenu />
        </div>
      </div>
      
      {/* Search Modal */}
      <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
    </motion.header>
  );
};

export default Header;
