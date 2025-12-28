import { motion } from "framer-motion";
import { Search, Scissors, Clock, Mic, MicOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getFilteredSalons, SalonBasic } from "@/data/salonsData";
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

const HeroSection = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSalonSuggestions, setShowSalonSuggestions] = useState(false);
  const [salonSuggestions, setSalonSuggestions] = useState<SalonBasic[]>([]);
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
        setShowSalonSuggestions(true);
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
    const filtered = getFilteredSalons(searchQuery);
    setSalonSuggestions(filtered);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSalonSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSalonSuggestions(true);
  };

  const handleSelectSalon = (salon: SalonBasic) => {
    addRecentSearch(salon);
    setShowSalonSuggestions(false);
    navigate(`/salon/${salon.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setShowSalonSuggestions(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <section className="relative py-4 overflow-hidden">
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
              {/* Search Input with Salon Suggestions */}
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
                      onFocus={() => setShowSalonSuggestions(true)}
                      placeholder="Search for salons, services..."
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
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
