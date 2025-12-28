import { motion } from "framer-motion";
import { MapPin, Locate, Loader2, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "@/contexts/LocationContext";
import { getFilteredCities } from "@/data/indianCities";

const LocationSelector = () => {
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
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="px-4 py-3"
    >
      <div ref={locationInputRef} className="relative">
        <div 
          className="flex items-center gap-2 px-4 py-3 bg-muted/50 rounded-xl border border-border/50 cursor-pointer hover:bg-muted/70 transition-colors"
          onClick={() => setShowSuggestions(true)}
        >
          <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
          <input
            type="text"
            value={locationInput}
            onChange={handleLocationChange}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Select your city"
            className="bg-transparent outline-none flex-1 text-sm text-foreground placeholder:text-muted-foreground font-body"
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
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md border border-border/80 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto"
          >
            <div className="p-1.5">
              {suggestions.map((city, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: index * 0.03 }}
                  onClick={() => handleSelectCity(city)}
                  className="w-full px-3 py-2.5 text-left hover:bg-primary/10 rounded-lg transition-all duration-200 flex items-center gap-2.5 text-sm group"
                >
                  <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  </div>
                  <span className="text-foreground font-body group-hover:text-primary transition-colors">{city}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default LocationSelector;
