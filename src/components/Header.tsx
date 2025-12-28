import { motion } from "framer-motion";
import { Search, MapPin, ChevronDown, Locate, Loader2 } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import NotificationCenter from "@/components/NotificationCenter";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "@/contexts/LocationContext";
import { getFilteredCities } from "@/data/indianCities";

const Header = () => {
  const navigate = useNavigate();
  const { selectedCity, setSelectedCity, isDetecting, detectLocation } = useLocation();
  const [locationInput, setLocationInput] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const locationRef = useRef<HTMLDivElement>(null);

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
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCity = (city: string) => {
    setLocationInput(city);
    setSelectedCity(city);
    setShowLocationDropdown(false);
  };

  const handleDetectLocation = async () => {
    await detectLocation();
    setShowLocationDropdown(false);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background shadow-sm border-b border-border"
    >
      <div className="container mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-lg">G</span>
          </div>
          <span className="font-display font-bold text-xl text-foreground hidden sm:block">
            Grumming
          </span>
        </div>

        {/* Location Selector - Swiggy Style */}
        <div ref={locationRef} className="relative">
          <button
            onClick={() => setShowLocationDropdown(!showLocationDropdown)}
            className="flex items-center gap-1 py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground max-w-[100px] sm:max-w-[150px] truncate">
              {selectedCity || "Select city"}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showLocationDropdown ? "rotate-180" : ""}`} />
          </button>

          {showLocationDropdown && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-background border border-border rounded-xl shadow-lg z-50">
              <div className="p-3 border-b border-border">
                <button
                  onClick={handleDetectLocation}
                  disabled={isDetecting}
                  className="w-full flex items-center gap-2 p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  {isDetecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Locate className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">Detect my location</span>
                </button>
              </div>
              <div className="p-2">
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Search for city..."
                  className="w-full px-3 py-2 text-sm bg-muted/50 rounded-lg border-none outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {suggestions.slice(0, 6).map((city, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectCity(city)}
                    className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{city}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Bar - Swiggy Style */}
        <div 
          onClick={() => navigate('/search')}
          className="flex-1 max-w-xl cursor-pointer"
        >
          <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 hover:bg-muted rounded-xl transition-colors">
            <Search className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Search for salons, services...</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <NotificationCenter />
          <UserMenu />
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
