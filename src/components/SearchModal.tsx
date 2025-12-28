import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Scissors, Clock, Sparkles, History } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSearchResults, SalonBasic, ServiceResult } from "@/data/salonsData";
import { useRecentSearches } from "@/hooks/useRecentSearches";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [salonResults, setSalonResults] = useState<SalonBasic[]>([]);
  const [serviceResults, setServiceResults] = useState<ServiceResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { recentSearches, addRecentSearch, clearRecentSearches, searchHistory, addSearchQuery, clearSearchHistory } = useRecentSearches();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const { salons, services } = getSearchResults(searchQuery);
      setSalonResults(salons);
      setServiceResults(services);
    } else {
      setSalonResults([]);
      setServiceResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSalonResults([]);
      setServiceResults([]);
    }
  }, [isOpen]);

  const handleSelectSalon = (salon: SalonBasic) => {
    addRecentSearch(salon);
    onClose();
    navigate(`/salon/${salon.id}`);
  };

  const handleSelectService = (service: ServiceResult) => {
    onClose();
    navigate(`/salon/${service.salonId}?service=${encodeURIComponent(service.serviceName)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      addSearchQuery(searchQuery.trim());
      onClose();
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSearchHistoryClick = (query: string) => {
    addSearchQuery(query);
    onClose();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const hasResults = salonResults.length > 0 || serviceResults.length > 0;
  const hasRecentSearches = searchQuery === '' && recentSearches.length > 0;
  const hasSearchHistory = searchQuery === '' && searchHistory.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] cursor-pointer"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-[301] bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
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
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
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
                      key={`${service.salonId}-${service.serviceName}-${index}`}
                      onClick={() => handleSelectService(service)}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3"
                    >
                      <img 
                        src={service.image} 
                        alt={service.serviceName}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{service.serviceName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {service.salonName}
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
              {!hasResults && !hasRecentSearches && !hasSearchHistory && searchQuery.length >= 2 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-muted-foreground text-sm">No results found for "{searchQuery}"</p>
                </div>
              )}

              {/* Initial state */}
              {!hasResults && !hasRecentSearches && !hasSearchHistory && searchQuery.length < 2 && (
                <div className="px-4 py-8 text-center">
                  <Search className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Start typing to search...</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;
