import { motion } from "framer-motion";
import { MapPin, Locate, Loader2, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import UserMenu from "@/components/UserMenu";
import NotificationCenter from "@/components/NotificationCenter";
import { useLocation } from "@/contexts/LocationContext";
import { getFilteredCities } from "@/data/indianCities";

const Header = () => {
  const { selectedCity, setSelectedCity, isDetecting, detectLocation } = useLocation();
  const [locationInput, setLocationInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const locationInputRef = useRef<HTMLDivElement>(null);

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
    setLocationInput(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelectCity = (city: string) => {
    setLocationInput(city);
    setSelectedCity(city);
    setShowSuggestions(false);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Location Selector */}
        <div ref={locationInputRef} className="relative">
          <div 
            className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border/50 cursor-pointer"
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
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto min-w-48">
              {suggestions.map((city, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectCity(city)}
                  className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-2 first:rounded-t-xl last:rounded-b-xl text-sm"
                >
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground font-body">{city}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <UserMenu />
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
