import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Scissors, Clock, Sparkles, History, MapPin, ChevronDown, Locate, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useLocation } from "@/contexts/LocationContext";
import { useSalonsByCity, useSearchSalons, DbSalon, DbSalonService } from "@/hooks/useSalons";
import { popularCities } from "@/data/indianCities";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLocationPicker?: () => void;
}

// Debounce hook for search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const SearchModal = ({ isOpen, onClose, onOpenLocationPicker }: SearchModalProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { recentSearches, addRecentSearch, clearRecentSearches, searchHistory, addSearchQuery, clearSearchHistory } = useRecentSearches();
  const { selectedCity, setSelectedCity, isDetecting, detectLocation } = useLocation();
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search query for performance
  const debouncedQuery = useDebounce(searchQuery, 200);

  // Fetch nearby salons from database
  const { salons: nearbySalons, isLoading: isLoadingNearby } = useSalonsByCity(selectedCity);

  // Search salons and services from database
  const { salons: salonResults, services: serviceResults, isLoading: isSearching } = useSearchSalons(debouncedQuery);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setShowLocationDropdown(false);
    }
  }, [isOpen]);

  // Close location dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    if (showLocationDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLocationDropdown]);

  const handleSelectCity = useCallback((city: string) => {
    setSelectedCity(city);
    setShowLocationDropdown(false);
  }, [setSelectedCity]);

  const handleDetectLocation = useCallback(async () => {
    await detectLocation({ forceFresh: true });
    setShowLocationDropdown(false);
  }, [detectLocation]);

  const handleSelectSalon = useCallback((salon: DbSalon) => {
    addRecentSearch({
      id: salon.id,
      name: salon.name,
      location: salon.location,
      city: salon.city,
      image: salon.image_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100&h=100&fit=crop",
    });
    onClose();
    navigate(`/salon/${salon.id}`);
  }, [addRecentSearch, navigate, onClose]);

  const handleSelectService = useCallback((service: DbSalonService & { salon_name: string }) => {
    onClose();
    navigate(`/salon/${service.salon_id}?service=${encodeURIComponent(service.name)}`);
  }, [navigate, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      addSearchQuery(searchQuery.trim());
      onClose();
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
    if (e.key === 'Escape') {
      onClose();
    }
  }, [addSearchQuery, navigate, onClose, searchQuery]);

  const handleSearchHistoryClick = useCallback((query: string) => {
    addSearchQuery(query);
    onClose();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }, [addSearchQuery, navigate, onClose]);

  const hasResults = salonResults.length > 0 || serviceResults.length > 0;
  const hasRecentSearches = searchQuery === '' && recentSearches.length > 0;
  const hasSearchHistory = searchQuery === '' && searchHistory.length > 0;
  const showNearbySuggestions = searchQuery === '' && nearbySalons.length > 0;
  const showNoNearbySalons = searchQuery === '' && nearbySalons.length === 0 && selectedCity && !hasRecentSearches && !isLoadingNearby;

  const portalRoot = typeof document !== "undefined" ? document.body : null;

  return portalRoot ? createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[300] cursor-pointer"
            onPointerDown={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-[301] bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search salons or services..."
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground font-body"
              />
              {isSearching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Location Toggle */}
            <div ref={locationDropdownRef} className="relative px-4 py-2 border-b border-border bg-muted/20">
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="flex items-center gap-2 text-sm hover:bg-muted px-2 py-1 rounded-lg transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="text-foreground font-medium max-w-40 truncate">
                  {selectedCity?.split(',')[0] || 'Select location'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Location Dropdown */}
              <AnimatePresence>
                {showLocationDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-2 right-2 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-[310] max-h-64 overflow-y-auto"
                  >
                    {/* Detect Location */}
                    <button
                      onClick={handleDetectLocation}
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

                    {/* Popular Cities */}
                    <div className="p-2">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Popular Cities
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {popularCities.slice(0, 8).map((city) => (
                          <button
                            key={city}
                            onClick={() => handleSelectCity(city)}
                            className="px-2 py-1.5 text-left hover:bg-primary/10 rounded-lg transition-colors text-xs group flex items-center gap-1.5"
                          >
                            <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                            <span className="text-foreground group-hover:text-primary transition-colors truncate">
                              {city.split(',')[0]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Results */}
            <div className="max-h-[55vh] overflow-y-auto">
              {/* Search History */}
              {hasSearchHistory && (
                <>
                  <div className="px-4 py-2 flex items-center justify-between border-b border-border bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <History className="w-3 h-3" /> Search History
                    </span>
                    <button
                      onClick={clearSearchHistory}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 p-3">
                    {searchHistory.map((query, index) => (
                      <button
                        key={`history-${index}`}
                        onClick={() => handleSearchHistoryClick(query)}
                        className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-full transition-colors flex items-center gap-1.5"
                      >
                        <Search className="w-3 h-3 text-muted-foreground" />
                        {query}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Recent Salon Visits */}
              {hasRecentSearches && (
                <>
                  <div className="px-4 py-2 flex items-center justify-between border-b border-border bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Recently Viewed
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.map((salon) => (
                    <button
                      key={`recent-${salon.id}`}
                      onClick={() => {
                        onClose();
                        navigate(`/salon/${salon.id}`);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3"
                    >
                      <img 
                        src={salon.image} 
                        alt={salon.name}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{salon.name}</p>
                        <p className="text-xs text-muted-foreground">{salon.location}, {salon.city}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* Services Section */}
              {serviceResults.length > 0 && (
                <>
                  <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> Services
                    </span>
                    <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full">
                      {serviceResults.length} found
                    </span>
                  </div>
                  {serviceResults.slice(0, 4).map((service, index) => (
                    <button
                      key={`${service.salon_id}-${service.name}-${index}`}
                      onClick={() => handleSelectService(service)}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Scissors className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{service.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {service.salon_name}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-primary">₹{service.price}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* Salons Section */}
              {salonResults.length > 0 && (
                <>
                  <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Scissors className="w-3 h-3" /> Salons
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {salonResults.length} found
                    </span>
                  </div>
                  {salonResults.slice(0, 4).map((salon) => (
                    <button
                      key={salon.id}
                      onClick={() => handleSelectSalon(salon)}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3"
                    >
                      <img 
                        src={salon.image_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100&h=100&fit=crop"} 
                        alt={salon.name}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{salon.name}</p>
                        <p className="text-xs text-muted-foreground">{salon.location}, {salon.city}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* View All Results Button */}
              {searchQuery.trim() && (
                <button
                  onClick={() => {
                    addSearchQuery(searchQuery.trim());
                    onClose();
                    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                  }}
                  className="w-full px-4 py-3 text-center border-t border-border bg-muted/30 hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">View all results for "{searchQuery}"</span>
                </button>
              )}

              {/* Empty state */}
              {!hasResults && !hasRecentSearches && !hasSearchHistory && debouncedQuery.length >= 2 && !isSearching && (
                <div className="px-4 py-8 text-center">
                  <p className="text-muted-foreground text-sm">No results found for "{debouncedQuery}"</p>
                </div>
              )}

              {/* Nearby Suggestions when no history */}
              {showNearbySuggestions && (
                <>
                  <div className="px-4 py-2 flex items-center justify-between border-b border-border bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Popular Nearby
                    </span>
                    {selectedCity && (
                      <span className="text-xs text-muted-foreground">{selectedCity.split(',')[0]}</span>
                    )}
                  </div>
                  {nearbySalons.slice(0, 5).map((salon) => (
                    <button
                      key={salon.id}
                      onClick={() => handleSelectSalon(salon)}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3"
                    >
                      <img 
                        src={salon.image_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100&h=100&fit=crop"} 
                        alt={salon.name}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{salon.name}</p>
                        <p className="text-xs text-muted-foreground">{salon.location}, {salon.city}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* No nearby salons message */}
              {showNoNearbySalons && (
                <div className="px-4 py-8 text-center">
                  <MapPin className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-foreground font-medium mb-1">No salons in {selectedCity?.split(',')[0]} yet</p>
                  <p className="text-muted-foreground text-sm mb-4">
                    We're expanding! Try changing your location or browse all salons.
                  </p>
                  <div className="flex flex-col gap-2">
                    {onOpenLocationPicker && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenLocationPicker();
                        }}
                        className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        Change Location
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onClose();
                        navigate('/search');
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      Browse All Salons
                    </button>
                  </div>
                </div>
              )}

              {/* Initial state - only when no city selected */}
              {!hasResults && !hasRecentSearches && !hasSearchHistory && !showNearbySuggestions && !showNoNearbySalons && searchQuery.length < 2 && (
                <div className="px-4 py-8 text-center">
                  <Search className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Start typing to search...</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    portalRoot
  ) : null;
};

export default SearchModal;
