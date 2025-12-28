import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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

const VOICE_LANGUAGES = [
  { code: 'en-IN', label: 'EN', name: 'English' },
  { code: 'hi-IN', label: 'हि', name: 'Hindi' },
];

const FloatingMicButton = () => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState('en-IN');
  const [transcript, setTranscript] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Show floating button after scrolling past hero section
  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionConstructor();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = voiceLang;

      recognitionRef.current.onresult = (event) => {
        const text = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setTranscript(text);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        // Navigate to search if we have a transcript
        if (transcript.trim()) {
          navigate(`/search?q=${encodeURIComponent(transcript.trim())}`);
          setIsExpanded(false);
          setTranscript('');
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied');
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [voiceLang, transcript, navigate]);

  const startListening = () => {
    if (!recognitionRef.current) {
      toast.error('Voice search not supported');
      return;
    }

    setTranscript('');
    recognitionRef.current.start();
    setIsListening(true);
    const langName = VOICE_LANGUAGES.find(l => l.code === voiceLang)?.name || 'English';
    toast.info(`Listening in ${langName}...`);
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleLanguage = () => {
    const currentIndex = VOICE_LANGUAGES.findIndex(l => l.code === voiceLang);
    const nextIndex = (currentIndex + 1) % VOICE_LANGUAGES.length;
    setVoiceLang(VOICE_LANGUAGES[nextIndex].code);
    toast.success(`Voice: ${VOICE_LANGUAGES[nextIndex].name}`);
  };

  const handleClose = () => {
    stopListening();
    setIsExpanded(false);
    setTranscript('');
  };

  const handleButtonClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      startListening();
    } else if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed bottom-24 right-4 z-50"
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ width: 56, height: 56, borderRadius: 28 }}
              animate={{ width: 280, height: 'auto', borderRadius: 16 }}
              exit={{ width: 56, height: 56, borderRadius: 28 }}
              className="bg-background border border-border shadow-lg overflow-hidden"
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">Voice Search</span>
                  <button
                    onClick={handleClose}
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Waveform / Transcript */}
                <div className="min-h-[60px] flex items-center justify-center mb-3 bg-muted/50 rounded-lg p-3">
                  {isListening ? (
                    <VoiceWaveform isActive={isListening} />
                  ) : transcript ? (
                    <p className="text-sm text-foreground text-center">{transcript}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">Tap mic to speak</p>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={toggleLanguage}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {VOICE_LANGUAGES.find(l => l.code === voiceLang)?.label}
                  </button>
                  
                  <motion.button
                    onClick={handleButtonClick}
                    whileTap={{ scale: 0.95 }}
                    className={`p-4 rounded-full transition-all ${
                      isListening 
                        ? 'bg-destructive text-destructive-foreground' 
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </motion.button>

                  <button
                    onClick={() => {
                      if (transcript.trim()) {
                        navigate(`/search?q=${encodeURIComponent(transcript.trim())}`);
                        handleClose();
                      }
                    }}
                    disabled={!transcript.trim()}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Search
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="collapsed"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleButtonClick}
              className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
            >
              <Mic className="w-6 h-6" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingMicButton;
