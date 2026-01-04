import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Store, Clock, MapPin, Phone, Mail, Globe, Camera,
  Shield, Bell, CreditCard, Users, Palette, ChevronRight,
  Save, Loader2, Check, AlertTriangle, Eye, EyeOff, Image,
  Calendar, Star, X, Upload, Building2, Instagram, Facebook,
  Sparkles, Wifi, Wind, CreditCard as CardIcon, Car, Coffee, Tv, Music, Baby, Accessibility
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Available amenities with icons
const AVAILABLE_AMENITIES = [
  { id: 'AC', label: 'Air Conditioning', icon: Wind },
  { id: 'WiFi', label: 'Free WiFi', icon: Wifi },
  { id: 'Card Payment', label: 'Card Payment', icon: CardIcon },
  { id: 'Parking', label: 'Parking Available', icon: Car },
  { id: 'Beverages', label: 'Complimentary Beverages', icon: Coffee },
  { id: 'TV', label: 'TV/Entertainment', icon: Tv },
  { id: 'Music', label: 'Background Music', icon: Music },
  { id: 'Kid Friendly', label: 'Kid Friendly', icon: Baby },
  { id: 'Wheelchair Access', label: 'Wheelchair Accessible', icon: Accessibility },
  { id: 'Premium Products', label: 'Premium Products', icon: Sparkles },
] as const;

interface SalonSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salon: {
    id: string;
    name: string;
    location: string;
    city: string;
    description?: string | null;
    phone?: string | null;
    email?: string | null;
    image_url?: string | null;
    opening_time?: string | null;
    closing_time?: string | null;
    is_active?: boolean | null;
    status?: string;
    amenities?: string[] | null;
  } | null;
  onSalonUpdated: () => void;
}

interface SalonFormData {
  name: string;
  description: string;
  location: string;
  city: string;
  phone: string;
  email: string;
  opening_time: string;
  closing_time: string;
  is_active: boolean;
  amenities: string[];
}

interface DayHours {
  day_of_week: number;
  is_open: boolean;
  opening_time: string;
  closing_time: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_DAY_HOURS: DayHours[] = [
  { day_of_week: 0, is_open: false, opening_time: '09:00', closing_time: '21:00' }, // Sunday
  { day_of_week: 1, is_open: true, opening_time: '09:00', closing_time: '21:00' },
  { day_of_week: 2, is_open: true, opening_time: '09:00', closing_time: '21:00' },
  { day_of_week: 3, is_open: true, opening_time: '09:00', closing_time: '21:00' },
  { day_of_week: 4, is_open: true, opening_time: '09:00', closing_time: '21:00' },
  { day_of_week: 5, is_open: true, opening_time: '09:00', closing_time: '21:00' },
  { day_of_week: 6, is_open: true, opening_time: '09:00', closing_time: '21:00' },
];

const SalonSettingsDialog = ({ open, onOpenChange, salon, onSalonUpdated }: SalonSettingsDialogProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [dayHours, setDayHours] = useState<DayHours[]>(DEFAULT_DAY_HOURS);
  const [useDaySpecificHours, setUseDaySpecificHours] = useState(false);
  const [loadingHours, setLoadingHours] = useState(false);

  const [formData, setFormData] = useState<SalonFormData>({
    name: '',
    description: '',
    location: '',
    city: '',
    phone: '',
    email: '',
    opening_time: '09:00',
    closing_time: '21:00',
    is_active: true,
    amenities: [],
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    newBookings: true,
    bookingCancellations: true,
    newReviews: true,
    dailySummary: false,
    promotionalAlerts: true,
  });

  // Helper to normalize time format (convert "09:00:00" to "09:00")
  const normalizeTime = (time: string | null | undefined, fallback: string): string => {
    if (!time) return fallback;
    // Extract just HH:MM from time strings like "09:00:00" or "09:00"
    const match = time.match(/^(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : fallback;
  };

  // Fetch day-specific hours
  const fetchDayHours = async (salonId: string) => {
    setLoadingHours(true);
    try {
      const { data, error } = await supabase
        .from('salon_business_hours')
        .select('*')
        .eq('salon_id', salonId)
        .order('day_of_week');

      if (error) throw error;

      if (data && data.length > 0) {
        setUseDaySpecificHours(true);
        const hours = data.map(d => ({
          day_of_week: d.day_of_week,
          is_open: d.is_open,
          opening_time: normalizeTime(d.opening_time, '09:00'),
          closing_time: normalizeTime(d.closing_time, '21:00'),
        }));
        // Fill in any missing days
        const fullHours = DEFAULT_DAY_HOURS.map(defaultDay => {
          const existing = hours.find(h => h.day_of_week === defaultDay.day_of_week);
          return existing || defaultDay;
        });
        setDayHours(fullHours);
      } else {
        setUseDaySpecificHours(false);
        setDayHours(DEFAULT_DAY_HOURS);
      }
    } catch (error) {
      console.error('Error fetching business hours:', error);
    } finally {
      setLoadingHours(false);
    }
  };

  useEffect(() => {
    if (salon && open) {
      setFormData({
        name: salon.name || '',
        description: salon.description || '',
        location: salon.location || '',
        city: salon.city || '',
        phone: salon.phone || '',
        email: salon.email || '',
        opening_time: normalizeTime(salon.opening_time, '09:00'),
        closing_time: normalizeTime(salon.closing_time, '21:00'),
        is_active: salon.is_active ?? true,
        amenities: salon.amenities || [],
      });
      setHasChanges(false);
      fetchDayHours(salon.id);
    }
  }, [salon, open]);

  const handleInputChange = (field: keyof SalonFormData, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleAmenityToggle = (amenityId: string) => {
    const newAmenities = formData.amenities.includes(amenityId)
      ? formData.amenities.filter(a => a !== amenityId)
      : [...formData.amenities, amenityId];
    handleInputChange('amenities', newAmenities);
  };

  const handleDayHoursChange = (dayIndex: number, field: keyof DayHours, value: string | boolean) => {
    setDayHours(prev => prev.map((day, idx) => 
      idx === dayIndex ? { ...day, [field]: value } : day
    ));
    setHasChanges(true);
  };

  const applyToAllDays = () => {
    const firstOpenDay = dayHours.find(d => d.is_open);
    if (firstOpenDay) {
      setDayHours(prev => prev.map(day => ({
        ...day,
        opening_time: firstOpenDay.opening_time,
        closing_time: firstOpenDay.closing_time,
      })));
      setHasChanges(true);
      toast({
        title: "Applied to all days",
        description: `Set all days to ${firstOpenDay.opening_time} - ${firstOpenDay.closing_time}`,
      });
    }
  };

  const saveDaySpecificHours = async () => {
    if (!salon) return;

    try {
      // Delete existing hours
      await supabase
        .from('salon_business_hours')
        .delete()
        .eq('salon_id', salon.id);

      // Insert new hours
      const hoursToInsert = dayHours.map(day => ({
        salon_id: salon.id,
        day_of_week: day.day_of_week,
        is_open: day.is_open,
        opening_time: day.opening_time + ':00',
        closing_time: day.closing_time + ':00',
      }));

      const { error } = await supabase
        .from('salon_business_hours')
        .insert(hoursToInsert);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  const handleSaveChanges = async () => {
    if (!salon) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('salons')
        .update({
          name: formData.name,
          description: formData.description || null,
          location: formData.location,
          city: formData.city,
          phone: formData.phone || null,
          email: formData.email || null,
          opening_time: formData.opening_time,
          closing_time: formData.closing_time,
          is_active: formData.is_active,
          amenities: formData.amenities,
          updated_at: new Date().toISOString(),
        })
        .eq('id', salon.id);

      if (error) throw error;

      // Save day-specific hours if enabled
      if (useDaySpecificHours) {
        await saveDaySpecificHours();
      }

      toast({
        title: "Settings saved",
        description: "Your salon settings have been updated successfully.",
      });

      setHasChanges(false);
      onSalonUpdated();
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const settingsSections = [
    { id: 'general', label: 'General', icon: Store },
    { id: 'amenities', label: 'Amenities', icon: Sparkles },
    { id: 'hours', label: 'Business Hours', icon: Clock },
    { id: 'contact', label: 'Contact Info', icon: Phone },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'visibility', label: 'Visibility', icon: Eye },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Salon Settings</DialogTitle>
                <DialogDescription className="text-sm">
                  Manage your salon profile and preferences
                </DialogDescription>
              </div>
            </div>
            {hasChanges && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Unsaved changes
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex flex-col md:flex-row h-[calc(90vh-180px)]">
          {/* Sidebar Navigation */}
          <div className="md:w-48 border-b md:border-b-0 md:border-r bg-muted/20">
            <nav className="p-2 md:p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
              {settingsSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                    ${activeTab === section.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  <section.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:inline">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              <AnimatePresence mode="wait">
                {/* General Settings */}
                {activeTab === 'general' && (
                  <motion.div
                    key="general"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-semibold mb-1">General Information</h3>
                      <p className="text-sm text-muted-foreground">Basic details about your salon</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Salon Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="Enter salon name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          placeholder="Tell customers about your salon..."
                          rows={4}
                          maxLength={500}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {formData.description.length}/500 characters
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="location">Address</Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="location"
                              value={formData.location}
                              onChange={(e) => handleInputChange('location', e.target.value)}
                              className="pl-10"
                              placeholder="Street address"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="city"
                              value={formData.city}
                              onChange={(e) => handleInputChange('city', e.target.value)}
                              className="pl-10"
                              placeholder="City, State"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Amenities */}
                {activeTab === 'amenities' && (
                  <motion.div
                    key="amenities"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Salon Amenities</h3>
                      <p className="text-sm text-muted-foreground">Select the amenities available at your salon</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {AVAILABLE_AMENITIES.map((amenity) => {
                        const isSelected = formData.amenities.includes(amenity.id);
                        const AmenityIcon = amenity.icon;
                        return (
                          <label
                            key={amenity.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                              ${isSelected 
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                              }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleAmenityToggle(amenity.id)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <AmenityIcon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {amenity.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {formData.amenities.length > 0 && (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium mb-2">Selected Amenities ({formData.amenities.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {formData.amenities.map(amenityId => (
                            <Badge key={amenityId} variant="secondary" className="text-xs">
                              {amenityId}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Business Hours */}
                {activeTab === 'hours' && (
                  <motion.div
                    key="hours"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Business Hours</h3>
                      <p className="text-sm text-muted-foreground">Set your salon's operating hours</p>
                    </div>

                    {loadingHours ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Toggle for day-specific hours */}
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-primary" />
                            <div>
                              <p className="text-sm font-medium">Day-specific hours</p>
                              <p className="text-xs text-muted-foreground">
                                Set different hours for each day
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={useDaySpecificHours}
                            onCheckedChange={(checked) => {
                              setUseDaySpecificHours(checked);
                              setHasChanges(true);
                            }}
                          />
                        </div>

                        {!useDaySpecificHours ? (
                          <>
                            {/* Simple hours for all days */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="opening_time">Opening Time</Label>
                                <Select
                                  value={formData.opening_time}
                                  onValueChange={(v) => handleInputChange('opening_time', v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 24 }, (_, i) => {
                                      const hour = i.toString().padStart(2, '0');
                                      return (
                                        <SelectItem key={hour} value={`${hour}:00`}>
                                          {hour}:00
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="closing_time">Closing Time</Label>
                                <Select
                                  value={formData.closing_time}
                                  onValueChange={(v) => handleInputChange('closing_time', v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 24 }, (_, i) => {
                                      const hour = i.toString().padStart(2, '0');
                                      return (
                                        <SelectItem key={hour} value={`${hour}:00`}>
                                          {hour}:00
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="p-4 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-primary" />
                                <div>
                                  <p className="text-sm font-medium">Current Schedule</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formData.opening_time} - {formData.closing_time} (All days)
                                  </p>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Day-specific hours editor */}
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={applyToAllDays}
                              >
                                Apply first day's hours to all
                              </Button>
                            </div>

                            <div className="space-y-3">
                              {dayHours.map((day, idx) => (
                                <div
                                  key={day.day_of_week}
                                  className={`p-3 rounded-lg border transition-colors ${
                                    day.is_open 
                                      ? 'bg-background border-border' 
                                      : 'bg-muted/50 border-muted'
                                  }`}
                                >
                                  <div className="flex items-center gap-4">
                                    {/* Day name and toggle */}
                                    <div className="flex items-center gap-3 min-w-[140px]">
                                      <Switch
                                        checked={day.is_open}
                                        onCheckedChange={(checked) => handleDayHoursChange(idx, 'is_open', checked)}
                                      />
                                      <span className={`text-sm font-medium ${!day.is_open ? 'text-muted-foreground' : ''}`}>
                                        {DAY_NAMES[day.day_of_week]}
                                      </span>
                                    </div>

                                    {/* Time selectors */}
                                    {day.is_open ? (
                                      <div className="flex items-center gap-2 flex-1">
                                        <Select
                                          value={day.opening_time}
                                          onValueChange={(v) => handleDayHoursChange(idx, 'opening_time', v)}
                                        >
                                          <SelectTrigger className="w-24 h-8 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Array.from({ length: 24 }, (_, i) => {
                                              const hour = i.toString().padStart(2, '0');
                                              return (
                                                <SelectItem key={hour} value={`${hour}:00`}>
                                                  {hour}:00
                                                </SelectItem>
                                              );
                                            })}
                                          </SelectContent>
                                        </Select>
                                        <span className="text-muted-foreground text-xs">to</span>
                                        <Select
                                          value={day.closing_time}
                                          onValueChange={(v) => handleDayHoursChange(idx, 'closing_time', v)}
                                        >
                                          <SelectTrigger className="w-24 h-8 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Array.from({ length: 24 }, (_, i) => {
                                              const hour = i.toString().padStart(2, '0');
                                              return (
                                                <SelectItem key={hour} value={`${hour}:00`}>
                                                  {hour}:00
                                                </SelectItem>
                                              );
                                            })}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">
                                        Closed
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Summary */}
                            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                              <div className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-primary mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium">Schedule Summary</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Open {dayHours.filter(d => d.is_open).length} days a week
                                    {dayHours.filter(d => !d.is_open).length > 0 && (
                                      <> • Closed on {dayHours.filter(d => !d.is_open).map(d => DAY_NAMES[d.day_of_week]).join(', ')}</>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Contact Info */}
                {activeTab === 'contact' && (
                  <motion.div
                    key="contact"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Contact Information</h3>
                      <p className="text-sm text-muted-foreground">How customers can reach you</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="pl-10"
                            placeholder="+91 98765 43210"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="pl-10"
                            placeholder="contact@yoursalon.com"
                          />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-sm font-medium mb-3">Social Media</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 border rounded-lg">
                            <Instagram className="w-5 h-5 text-pink-500" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">Instagram</p>
                              <p className="text-xs text-muted-foreground">Coming soon</p>
                            </div>
                            <Badge variant="outline">Soon</Badge>
                          </div>
                          <div className="flex items-center gap-3 p-3 border rounded-lg">
                            <Facebook className="w-5 h-5 text-blue-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">Facebook</p>
                              <p className="text-xs text-muted-foreground">Coming soon</p>
                            </div>
                            <Badge variant="outline">Soon</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Notifications */}
                {activeTab === 'notifications' && (
                  <motion.div
                    key="notifications"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Notification Preferences</h3>
                      <p className="text-sm text-muted-foreground">Control how you receive updates</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">New Bookings</p>
                            <p className="text-xs text-muted-foreground">Get notified when customers book</p>
                          </div>
                        </div>
                        <Switch
                          checked={notifications.newBookings}
                          onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, newBookings: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <X className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Booking Cancellations</p>
                            <p className="text-xs text-muted-foreground">Alert when bookings are cancelled</p>
                          </div>
                        </div>
                        <Switch
                          checked={notifications.bookingCancellations}
                          onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, bookingCancellations: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Star className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">New Reviews</p>
                            <p className="text-xs text-muted-foreground">Get notified when customers leave reviews</p>
                          </div>
                        </div>
                        <Switch
                          checked={notifications.newReviews}
                          onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, newReviews: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Daily Summary</p>
                            <p className="text-xs text-muted-foreground">Receive daily booking summary</p>
                          </div>
                        </div>
                        <Switch
                          checked={notifications.dailySummary}
                          onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, dailySummary: checked }))}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Visibility Settings */}
                {activeTab === 'visibility' && (
                  <motion.div
                    key="visibility"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Visibility & Status</h3>
                      <p className="text-sm text-muted-foreground">Control how your salon appears to customers</p>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              formData.is_active 
                                ? 'bg-green-100 dark:bg-green-900/30' 
                                : 'bg-muted'
                            }`}>
                              {formData.is_active ? (
                                <Eye className="w-5 h-5 text-green-600" />
                              ) : (
                                <EyeOff className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">Salon Visibility</p>
                              <p className="text-xs text-muted-foreground">
                                {formData.is_active 
                                  ? 'Your salon is visible to customers' 
                                  : 'Your salon is hidden from search'
                                }
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={formData.is_active}
                            onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                          />
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <Shield className="w-5 h-5 text-primary" />
                          <p className="text-sm font-medium">Approval Status</p>
                        </div>
                        <Badge 
                          variant={salon?.status === 'approved' ? 'default' : 'secondary'}
                          className={`${
                            salon?.status === 'approved' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                              : salon?.status === 'rejected'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}
                        >
                          {salon?.status === 'approved' ? 'Approved' : salon?.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-2">
                          {salon?.status === 'approved' 
                            ? 'Your salon has been approved and is live.' 
                            : salon?.status === 'rejected'
                              ? 'Your salon application was not approved.'
                              : 'Your salon is under review by our team.'
                          }
                        </p>
                      </div>

                      {formData.is_active && salon?.status === 'approved' && (
                        <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex gap-3">
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                Your salon is live!
                              </p>
                              <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                                Customers can find and book appointments at your salon
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveChanges} 
            disabled={isSaving || !hasChanges}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalonSettingsDialog;
