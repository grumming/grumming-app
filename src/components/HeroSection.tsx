import { motion, AnimatePresence } from "framer-motion";
import { Search, Scissors, Clock, Mic, MicOff, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSearchResults, SalonBasic, ServiceResult } from "@/data/salonsData";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { toast } from "sonner";
import VoiceWaveform from "./VoiceWaveform";

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface HeroSectionProps {
  onSearchActiveChange?: (isActive: boolean) => void;
}

const HeroSection = ({ onSearchActiveChange }: HeroSectionProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [salonResults, setSalonResults] = useState<SalonBasic[]>([]);
  const [serviceResults, setServiceResults] = useState<ServiceResult[]>([]);
  const [isListening, setIsListening] = useState(false);
  const searchInputRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionConstructor();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-IN';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setSearchQuery(transcript);
        setShowSuggestions(true);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please allow microphone access.');
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) {
      toast.error('Voice search is not supported in your browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setSearchQuery('');
      recognitionRef.current.start();
      setIsListening(true);
      toast.info('Listening... Speak now');
    }
  };

  useEffect(() => {
    const results = getSearchResults(searchQuery);
    setSalonResults(results.salons);
    setServiceResults(results.services);
  }, [searchQuery]);

  // Notify parent when search is active
  useEffect(() => {
    const isActive = showSuggestions && (salonResults.length > 0 || serviceResults.length > 0 || (searchQuery === '' && recentSearches.length > 0));
    onSearchActiveChange?.(isActive);
  }, [showSuggestions, salonResults.length, serviceResults.length, searchQuery, recentSearches.length, onSearchActiveChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelectSalon = (salon: SalonBasic) => {
    addRecentSearch(salon);
    setShowSuggestions(false);
    navigate(`/salon/${salon.id}`);
  };

  const handleSelectService = (service: ServiceResult) => {
    setShowSuggestions(false);
    navigate(`/salon/${service.salonId}?service=${encodeURIComponent(service.serviceName)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const hasResults = salonResults.length > 0 || serviceResults.length > 0;
  const hasRecentSearches = searchQuery === '' && recentSearches.length > 0;

  return (
    <>
      {/* Backdrop overlay */}
      <AnimatePresence>
        {showSuggestions && (hasResults || hasRecentSearches) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[90]"
            onClick={() => setShowSuggestions(false)}
          />
        )}
      </AnimatePresence>
      
      <section className="relative py-4 z-[95]">
        <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-xl mx-auto"
        >
          {/* Search Card */}
          <div className="bg-background border border-border rounded-xl p-1.5">
            <div className="flex flex-col sm:flex-row gap-1.5">
              {/* Search Input with Suggestions */}
              <div ref={searchInputRef} className="relative flex-1">
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 rounded-lg border border-border/50">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  {isListening ? (
                    <VoiceWaveform isActive={isListening} />
                  ) : (
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Search salons or services..."
                      className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground font-body"
                    />
                  )}
                  <button
                    onClick={toggleVoiceSearch}
                    className={`p-2 rounded-full transition-all duration-200 ${
                      isListening 
                        ? 'bg-primary text-primary-foreground animate-pulse' 
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                    title={isListening ? "Stop listening" : "Voice search"}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Search Suggestions Dropdown */}
                {showSuggestions && (hasResults || hasRecentSearches) && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-xl z-[100] max-h-[400px] overflow-y-auto overflow-x-hidden">
                    {/* Recent Searches */}
                    {hasRecentSearches && (
                      <>
                        <div className="px-4 py-2 flex items-center justify-between border-b border-border bg-background">
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
                            className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3 bg-background"
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
                        {serviceResults.map((service, index) => (
                          <button
                            key={`${service.salonId}-${service.serviceName}-${index}`}
                            onClick={() => handleSelectService(service)}
                            className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3 bg-background"
                          >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-semibold text-foreground">{service.serviceName}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {service.salonName} • {service.location}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-base font-bold text-primary">₹{service.price}</p>
                              <p className="text-xs text-muted-foreground">{service.duration}</p>
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
                        {salonResults.map((salon) => (
                          <button
                            key={salon.id}
                            onClick={() => handleSelectSalon(salon)}
                            className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3 bg-background"
                          >
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <Scissors className="w-5 h-5 text-foreground" />
                            </div>
                            <div>
                              <p className="text-base font-semibold text-foreground">{salon.name}</p>
                              <p className="text-sm text-muted-foreground">{salon.location}, {salon.city}</p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {/* View All Results Button */}
                    {searchQuery.trim() && (
                      <button
                        onClick={() => {
                          setShowSuggestions(false);
                          navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                        }}
                        className="w-full px-4 py-3 text-center border-t border-border bg-muted/30 hover:bg-muted transition-colors flex items-center justify-center gap-2 rounded-b-xl"
                      >
                        <Search className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">View all results for "{searchQuery}"</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
    </>
  );
};

export default HeroSection;
