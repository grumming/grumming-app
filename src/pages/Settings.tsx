import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Bell, Globe, Lock, Shield, HelpCircle,
  ChevronRight, Eye, EyeOff, Volume2, VolumeX, Vibrate, Check, Receipt
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import BottomNav from '@/components/BottomNav';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en-IN', name: 'English (India)', nativeName: 'English', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
];

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Settings state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(languages[0]);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleLanguageSelect = (language: Language) => {
    setSelectedLanguage(language);
    setShowLanguageModal(false);
    toast({
      title: 'Language updated',
      description: `App language set to ${language.name}`,
    });
  };

  const handleToggle = (
    setter: React.Dispatch<React.SetStateAction<boolean>>, 
    value: boolean, 
    message: string
  ) => {
    setter(value);
    toast({
      title: 'Setting updated',
      description: message,
    });
  };

  const appSettings = [
    {
      icon: soundEnabled ? Volume2 : VolumeX,
      label: 'Sound Effects',
      description: 'Play sounds for notifications and actions',
      value: soundEnabled,
      onChange: (v: boolean) => handleToggle(setSoundEnabled, v, `Sound effects ${v ? 'enabled' : 'disabled'}`),
    },
    {
      icon: Vibrate,
      label: 'Vibration',
      description: 'Vibrate on notifications and actions',
      value: vibrationEnabled,
      onChange: (v: boolean) => handleToggle(setVibrationEnabled, v, `Vibration ${v ? 'enabled' : 'disabled'}`),
    },
    {
      icon: hideBalance ? EyeOff : Eye,
      label: 'Hide Wallet Balance',
      description: 'Hide your wallet balance on the profile page',
      value: hideBalance,
      onChange: (v: boolean) => handleToggle(setHideBalance, v, `Wallet balance ${v ? 'hidden' : 'visible'}`),
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/profile')} 
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-lg font-semibold text-foreground">Settings</h1>
        </div>
      </header>



      {/* App Preferences Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 pb-4"
      >
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">APP PREFERENCES</h2>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {appSettings.map((setting, index) => (
            <div
              key={setting.label}
              className={`flex items-center gap-4 p-4 ${
                index !== appSettings.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <setting.icon className="w-4.5 h-4.5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium text-foreground">{setting.label}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
              </div>
              <Switch
                checked={setting.value}
                onCheckedChange={setting.onChange}
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Other Settings Links */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 pb-4"
      >
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">MORE</h2>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => navigate('/notification-settings')}
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
          >
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <Bell className="w-4.5 h-4.5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-medium text-foreground">Notifications</span>
              <p className="text-xs text-muted-foreground mt-0.5">Manage notification preferences</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => navigate('/payment-history')}
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
          >
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <Receipt className="w-4.5 h-4.5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-medium text-foreground">Payment History</span>
              <p className="text-xs text-muted-foreground mt-0.5">View all transactions & receipts</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => navigate('/privacy-security')}
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
          >
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-medium text-foreground">Privacy & Security</span>
              <p className="text-xs text-muted-foreground mt-0.5">Manage your data and account security</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => {}}
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
          >
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <HelpCircle className="w-4.5 h-4.5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-medium text-foreground">Help & Support</span>
              <p className="text-xs text-muted-foreground mt-0.5">FAQs, contact us, feedback</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          
          <button
            onClick={() => setShowLanguageModal(true)}
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
          >
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <Globe className="w-4.5 h-4.5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-medium text-foreground">Language</span>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedLanguage.name}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => {}}
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-4.5 h-4.5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-medium text-foreground">Change Password</span>
              <p className="text-xs text-muted-foreground mt-0.5">Update your account password</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </motion.div>

      {/* Language Selection Modal */}
      <Dialog open={showLanguageModal} onOpenChange={setShowLanguageModal}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Select Language
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            <div className="space-y-1 pb-4">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageSelect(language)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedLanguage.code === language.code
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted border border-transparent'
                  }`}
                >
                  <span className="text-2xl">{language.flag}</span>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">{language.name}</p>
                    <p className="text-xs text-muted-foreground">{language.nativeName}</p>
                  </div>
                  {selectedLanguage.code === language.code && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Settings;
