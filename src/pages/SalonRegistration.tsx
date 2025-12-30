import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight,
  Store, 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  Loader2, 
  CheckCircle, 
  Camera, 
  X, 
  Upload, 
  Crop,
  FileText,
  Sparkles,
  Building,
  Check,
  Eye,
  Edit2,
  Scissors,
  Plus,
  Trash2,
  IndianRupee
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { indianCities } from '@/data/indianCities';
import ImageCropDialog from '@/components/ImageCropDialog';

// Validation schemas for each step
const basicInfoSchema = z.object({
  name: z.string().min(2, 'Salon name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
});

const locationSchema = z.object({
  location: z.string().min(5, 'Please enter a valid address').max(200),
  city: z.string().min(1, 'Please select a city'),
});

const contactSchema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number').optional().or(z.literal('')),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  openingTime: z.string(),
  closingTime: z.string(),
});

type SalonFormData = {
  name: string;
  description: string;
  location: string;
  city: string;
  phone: string;
  email: string;
  openingTime: string;
  closingTime: string;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ImageFile {
  file: File;
  preview: string;
  id: string;
}

interface ServiceItem {
  id: string;
  name: string;
  duration: string;
  price: number;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS = [
  { id: 1, title: 'Basic Info', icon: Store, description: 'Name & about your salon' },
  { id: 2, title: 'Location', icon: MapPin, description: 'Where is your salon' },
  { id: 3, title: 'Contact', icon: Phone, description: 'Hours & contact details' },
  { id: 4, title: 'Photos', icon: Camera, description: 'Add salon photos' },
  { id: 5, title: 'Services', icon: Scissors, description: 'Add your services' },
  { id: 6, title: 'Review', icon: Eye, description: 'Review & submit' },
];

const DEFAULT_SERVICES: ServiceItem[] = [
  { id: '1', name: 'Regular Haircut', duration: '30 min', price: 49 },
  { id: '2', name: 'Beard Trim', duration: '15 min', price: 49 },
  { id: '3', name: 'Haircut + Beard', duration: '45 min', price: 89 },
];

const DURATION_OPTIONS = ['15 min', '30 min', '45 min', '60 min'];

const SalonRegistration = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editSalonId = searchParams.get('edit');
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(!!editSalonId);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const [newService, setNewService] = useState({ name: '', duration: '30 min', price: 49 });
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState<SalonFormData>({
    name: '',
    description: '',
    location: '',
    city: '',
    phone: '',
    email: '',
    openingTime: '09:00',
    closingTime: '21:00',
  });

  // Load existing salon data for re-apply/edit mode
  useEffect(() => {
    const loadExistingSalon = async () => {
      if (!editSalonId || !user) return;
      
      setIsLoadingExisting(true);
      try {
        // Verify ownership
        const { data: ownership } = await supabase
          .from('salon_owners')
          .select('salon_id')
          .eq('user_id', user.id)
          .eq('salon_id', editSalonId)
          .maybeSingle();
        
        if (!ownership) {
          toast({
            title: 'Access denied',
            description: 'You do not own this salon',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        // Load salon data
        const { data: salon, error } = await supabase
          .from('salons')
          .select('*')
          .eq('id', editSalonId)
          .single();
        
        if (error || !salon) {
          toast({
            title: 'Salon not found',
            description: 'Could not load salon data',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        // Load existing services
        const { data: existingServices } = await supabase
          .from('salon_services')
          .select('*')
          .eq('salon_id', editSalonId);

        setFormData({
          name: salon.name || '',
          description: salon.description || '',
          location: salon.location || '',
          city: salon.city || '',
          phone: salon.phone || '',
          email: salon.email || '',
          openingTime: salon.opening_time?.slice(0, 5) || '09:00',
          closingTime: salon.closing_time?.slice(0, 5) || '21:00',
        });

        if (existingServices && existingServices.length > 0) {
          setServices(existingServices.map(s => ({
            id: s.id,
            name: s.name,
            duration: s.duration,
            price: s.price,
          })));
        }

        setIsEditMode(true);
      } catch (err) {
        console.error('Error loading salon:', err);
      } finally {
        setIsLoadingExisting(false);
      }
    };

    if (user) {
      loadExistingSalon();
    }
  }, [editSalonId, user, navigate, toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      // Store the intended destination so user returns here after login
      localStorage.setItem('pendingSalonOwnerRegistration', 'true');
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const updateField = (field: keyof SalonFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep = (step: WizardStep): boolean => {
    try {
      switch (step) {
        case 1:
          basicInfoSchema.parse({ name: formData.name, description: formData.description });
          break;
        case 2:
          locationSchema.parse({ location: formData.location, city: formData.city });
          break;
        case 3:
          contactSchema.parse({ 
            phone: formData.phone, 
            email: formData.email,
            openingTime: formData.openingTime,
            closingTime: formData.closingTime
          });
          break;
        case 4:
          return true; // Photos are optional
        case 5:
          if (services.length === 0) {
            toast({
              title: 'Add at least one service',
              description: 'Please add at least one haircut service',
              variant: 'destructive',
            });
            return false;
          }
          return true;
        case 6:
          return true; // Review step
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            newErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 6) {
        setCurrentStep((prev) => (prev + 1) as WizardStep);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  // Service management functions
  const addService = () => {
    if (!newService.name.trim()) {
      toast({
        title: 'Enter service name',
        description: 'Please provide a name for the service',
        variant: 'destructive',
      });
      return;
    }
    
    const service: ServiceItem = {
      id: crypto.randomUUID(),
      name: newService.name.trim(),
      duration: newService.duration,
      price: newService.price,
    };
    
    setServices(prev => [...prev, service]);
    setNewService({ name: '', duration: '30 min', price: 49 });
  };

  const removeService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const remainingSlots = MAX_IMAGES - selectedImages.length;
    if (remainingSlots <= 0) {
      toast({
        title: 'Maximum images reached',
        description: `You can only upload up to ${MAX_IMAGES} images`,
        variant: 'destructive',
      });
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, or WebP image',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
    setPendingFile(file);
    setCropDialogOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], pendingFile?.name || 'cropped-image.jpg', {
      type: 'image/jpeg',
    });
    
    const imageFile: ImageFile = {
      file: croppedFile,
      preview: URL.createObjectURL(croppedBlob),
      id: crypto.randomUUID(),
    };
    
    setSelectedImages(prev => [...prev, imageFile]);
    
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
    setImageToCrop(null);
    setPendingFile(null);
  };

  const handleCropDialogClose = (open: boolean) => {
    if (!open && imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
      setPendingFile(null);
    }
    setCropDialogOpen(open);
  };

  const removeImage = (id: string) => {
    setSelectedImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const uploadImages = async (salonId: string): Promise<string | null> => {
    if (selectedImages.length === 0) return null;
    
    setIsUploadingImage(true);
    setUploadProgress(0);
    
    let mainImageUrl: string | null = null;

    try {
      for (let i = 0; i < selectedImages.length; i++) {
        const image = selectedImages[i];
        const fileExt = image.file.name.split('.').pop();
        const fileName = i === 0 
          ? `${salonId}/main.${fileExt}`
          : `${salonId}/gallery-${i}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('salon-images')
          .upload(fileName, image.file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        if (i === 0) {
          const { data: publicUrlData } = supabase.storage
            .from('salon-images')
            .getPublicUrl(fileName);
          mainImageUrl = publicUrlData.publicUrl;
        }

        setUploadProgress(Math.round(((i + 1) / selectedImages.length) * 100));
      }

      return mainImageUrl;
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast({
        title: 'Image upload failed',
        description: 'Some images could not be uploaded. You can add them later.',
        variant: 'destructive',
      });
      return mainImageUrl;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to register a salon',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    setIsLoading(true);

    try {
      let salonId: string;

      if (isEditMode && editSalonId) {
        // Update existing salon and reset status to pending
        const { error: updateError } = await supabase
          .from('salons')
          .update({
            name: formData.name.trim(),
            location: formData.location.trim(),
            city: formData.city,
            description: formData.description?.trim() || null,
            phone: formData.phone || null,
            email: formData.email || null,
            opening_time: formData.openingTime,
            closing_time: formData.closingTime,
            status: 'pending',
            is_active: false,
          })
          .eq('id', editSalonId);

        if (updateError) throw updateError;
        salonId = editSalonId;

        // Update services - delete old and insert new
        await supabase
          .from('salon_services')
          .delete()
          .eq('salon_id', editSalonId);

        if (services.length > 0) {
          const servicesToInsert = services.map(service => ({
            salon_id: editSalonId,
            name: service.name,
            category: 'Haircut',
            duration: service.duration,
            price: service.price,
            is_active: true,
          }));
          
          await supabase
            .from('salon_services')
            .insert(servicesToInsert);
        }
      } else {
        // Create new salon
        const { data: salonData, error: salonError } = await supabase
          .from('salons')
          .insert({
            name: formData.name.trim(),
            location: formData.location.trim(),
            city: formData.city,
            description: formData.description?.trim() || null,
            phone: formData.phone || null,
            email: formData.email || null,
            opening_time: formData.openingTime,
            closing_time: formData.closingTime,
            is_active: false,
            status: 'pending',
          })
          .select()
          .single();

        if (salonError) throw salonError;
        salonId = salonData.id;

        // Save services
        if (services.length > 0) {
          const servicesToInsert = services.map(service => ({
            salon_id: salonData.id,
            name: service.name,
            category: 'Haircut',
            duration: service.duration,
            price: service.price,
            is_active: true,
          }));
          
          const { error: servicesError } = await supabase
            .from('salon_services')
            .insert(servicesToInsert);
            
          if (servicesError) {
            console.error('Services insert error:', servicesError);
          }
        }

        const { error: ownerError } = await supabase
          .from('salon_owners')
          .insert({
            user_id: user.id,
            salon_id: salonData.id,
            is_primary: true,
          });

        if (ownerError) throw ownerError;

        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', user.id)
          .eq('role', 'salon_owner')
          .maybeSingle();

        if (!existingRole) {
          await supabase
            .from('user_roles')
            .insert({
              user_id: user.id,
              role: 'salon_owner',
            });
        }
      }

      // Upload images if any
      if (selectedImages.length > 0) {
        const imageUrl = await uploadImages(salonId);
        if (imageUrl) {
          await supabase
            .from('salons')
            .update({ image_url: imageUrl })
            .eq('id', salonId);
        }
      }

      setIsComplete(true);
      
      toast({
        title: isEditMode ? 'Salon Resubmitted!' : 'Salon Registered!',
        description: 'Your salon has been submitted for review.',
      });

    } catch (error: any) {
      console.error('Salon registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to register salon. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !user || isLoadingExisting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-3">{isEditMode ? 'Resubmission Complete!' : 'Registration Submitted!'}</h2>
          <p className="text-muted-foreground mb-8">
            Your salon has been {isEditMode ? 'resubmitted' : 'submitted'} for review. Our team will verify your details and activate your salon within 24-48 hours.
          </p>
          <div className="space-y-3">
            <Button onClick={() => navigate('/salon-dashboard')} className="w-full">
              Go to Salon Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Return to Home
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {imageToCrop && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={handleCropDialogClose}
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          aspectRatio={16 / 9}
          circularCrop={false}
          title="Crop Salon Photo"
        />
      )}
      
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-3 max-w-3xl mx-auto">
            <button 
              onClick={() => currentStep === 1 ? navigate(-1) : handleBack()} 
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{isEditMode ? 'Edit & Resubmit Salon' : 'List Your Salon'}</h1>
              <p className="text-xs text-muted-foreground">Step {currentStep} of 6</p>
            </div>
          </div>
        </header>

        {/* Progress Steps */}
        <div className="px-4 py-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <motion.div
                      animate={{
                        scale: isActive ? 1.1 : 1,
                        backgroundColor: isCompleted 
                          ? 'hsl(var(--primary))' 
                          : isActive 
                            ? 'hsl(var(--primary))' 
                            : 'hsl(var(--muted))',
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                        isCompleted || isActive 
                          ? 'text-primary-foreground' 
                          : 'text-muted-foreground'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </motion.div>
                    <span className={`text-xs font-medium hidden sm:block ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                      isCompleted ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm"
            >
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Store className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold">Tell us about your salon</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Let's start with the basics
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Salon Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="e.g., Luxe Beauty Lounge"
                        className={errors.name ? 'border-destructive' : ''}
                      />
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">
                        Description
                        <span className="text-muted-foreground text-xs ml-1">(Optional)</span>
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        placeholder="Tell customers about your salon, services, and what makes you special..."
                        rows={4}
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {formData.description?.length || 0}/500
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Location */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MapPin className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold">Where is your salon?</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Help customers find you easily
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>City *</Label>
                      <Select
                        value={formData.city}
                        onValueChange={(value) => updateField('city', value)}
                      >
                        <SelectTrigger className={errors.city ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select your city" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {indianCities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Full Address *</Label>
                      <Textarea
                        id="location"
                        value={formData.location}
                        onChange={(e) => updateField('location', e.target.value)}
                        placeholder="Shop number, building name, street, area, landmark..."
                        rows={3}
                        className={errors.location ? 'border-destructive' : ''}
                      />
                      {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Contact & Hours */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Phone className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold">Contact & Hours</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      How can customers reach you?
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Operating Hours
                      </Label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Label htmlFor="openingTime" className="text-xs text-muted-foreground">Opens at</Label>
                          <Input
                            id="openingTime"
                            type="time"
                            value={formData.openingTime}
                            onChange={(e) => updateField('openingTime', e.target.value)}
                          />
                        </div>
                        <span className="text-muted-foreground mt-5">to</span>
                        <div className="flex-1">
                          <Label htmlFor="closingTime" className="text-xs text-muted-foreground">Closes at</Label>
                          <Input
                            id="closingTime"
                            type="time"
                            value={formData.closingTime}
                            onChange={(e) => updateField('closingTime', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">
                          Phone
                          <span className="text-muted-foreground text-xs ml-1">(Optional)</span>
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="10-digit number"
                          className={errors.phone ? 'border-destructive' : ''}
                        />
                        {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">
                          Email
                          <span className="text-muted-foreground text-xs ml-1">(Optional)</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateField('email', e.target.value)}
                          placeholder="salon@example.com"
                          className={errors.email ? 'border-destructive' : ''}
                        />
                        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Photos */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Camera className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold">Add Photos</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Show off your salon - first impressions matter!
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        Salon Photos
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {selectedImages.length}/{MAX_IMAGES}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {selectedImages.map((image, index) => (
                        <motion.div
                          key={image.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="relative aspect-square"
                        >
                          <img
                            src={image.preview}
                            alt={`Salon preview ${index + 1}`}
                            className="w-full h-full object-cover rounded-xl border border-border"
                          />
                          {index === 0 && (
                            <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                              Main
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      ))}
                      
                      {selectedImages.length < MAX_IMAGES && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                        >
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Add Photo</span>
                        </button>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Crop className="w-3 h-3" />
                      Images will be cropped to 16:9 ratio
                    </p>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageSelect}
                      className="hidden"
                    />

                    {selectedImages.length === 0 && (
                      <div className="p-4 bg-muted/50 rounded-lg border border-border/50 text-center">
                        <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Salons with photos get 3x more bookings!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 5: Services */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Scissors className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold">Add Your Services</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      List the haircut services you offer
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Current Services */}
                    {services.length > 0 && (
                      <div className="space-y-2">
                        <Label>Your Services</Label>
                        <div className="space-y-2">
                          {services.map((service) => (
                            <motion.div
                              key={service.id}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <Scissors className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{service.name}</p>
                                  <p className="text-xs text-muted-foreground">{service.duration}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-primary">₹{service.price}</span>
                                <button
                                  type="button"
                                  onClick={() => removeService(service.id)}
                                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add New Service */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-3">
                      <Label className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add New Service
                      </Label>
                      
                      <div className="space-y-3">
                        <Input
                          placeholder="Service name (e.g., Kids Haircut)"
                          value={newService.name}
                          onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                        />
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Duration</Label>
                            <Select
                              value={newService.duration}
                              onValueChange={(value) => setNewService(prev => ({ ...prev, duration: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DURATION_OPTIONS.map((d) => (
                                  <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Price (₹)</Label>
                            <Input
                              type="number"
                              min={1}
                              value={newService.price}
                              onChange={(e) => setNewService(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                            />
                          </div>
                        </div>
                        
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addService}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Service
                        </Button>
                      </div>
                    </div>

                    {services.length === 0 && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900/50 text-center">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          Please add at least one service to continue
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 6: Review */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Eye className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold">Review Your Details</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Make sure everything looks good before submitting
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Basic Info Review */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-primary" />
                          <h3 className="font-medium">Basic Info</h3>
                        </div>
                        <button
                          onClick={() => setCurrentStep(1)}
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Salon Name:</span>
                          <span className="ml-2 font-medium">{formData.name}</span>
                        </div>
                        {formData.description && (
                          <div>
                            <span className="text-muted-foreground">Description:</span>
                            <p className="mt-1 text-muted-foreground/80 text-xs">{formData.description}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location Review */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <h3 className="font-medium">Location</h3>
                        </div>
                        <button
                          onClick={() => setCurrentStep(2)}
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">City:</span>
                          <span className="ml-2 font-medium">{formData.city}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Address:</span>
                          <p className="mt-1 text-muted-foreground/80 text-xs">{formData.location}</p>
                        </div>
                      </div>
                    </div>

                    {/* Contact & Hours Review */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-primary" />
                          <h3 className="font-medium">Contact & Hours</h3>
                        </div>
                        <button
                          onClick={() => setCurrentStep(3)}
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Hours:</span>
                          <span className="ml-2 font-medium">{formData.openingTime} - {formData.closingTime}</span>
                        </div>
                        {formData.phone && (
                          <div>
                            <span className="text-muted-foreground">Phone:</span>
                            <span className="ml-2 font-medium">{formData.phone}</span>
                          </div>
                        )}
                        {formData.email && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="ml-2 font-medium">{formData.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Photos Review */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-primary" />
                          <h3 className="font-medium">Photos</h3>
                        </div>
                        <button
                          onClick={() => setCurrentStep(4)}
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                      </div>
                      {selectedImages.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2">
                          {selectedImages.map((image, index) => (
                            <div key={image.id} className="relative aspect-square">
                              <img
                                src={image.preview}
                                alt={`Salon ${index + 1}`}
                                className="w-full h-full object-cover rounded-lg"
                              />
                              {index === 0 && (
                                <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-primary text-primary-foreground px-1 py-0.5 rounded">
                                  Main
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No photos added</p>
                      )}
                    </div>

                    {/* Services Review */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Scissors className="w-4 h-4 text-primary" />
                          <h3 className="font-medium">Services ({services.length})</h3>
                        </div>
                        <button
                          onClick={() => setCurrentStep(5)}
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                      </div>
                      <div className="space-y-2">
                        {services.map((service) => (
                          <div key={service.id} className="flex items-center justify-between text-sm">
                            <span>{service.name}</span>
                            <span className="font-medium text-primary">₹{service.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Note */}
                    <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-900/50">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            Ready to submit!
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                            Your salon will be reviewed by our team within 24-48 hours. You'll receive a notification once approved.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-3 mt-6">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            
            <Button
              onClick={handleNext}
              disabled={isLoading || isUploadingImage}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isUploadingImage 
                    ? `Uploading... ${uploadProgress}%` 
                    : 'Submitting...'}
                </>
              ) : currentStep === 6 ? (
                <>
                  Submit for Review
                  <CheckCircle className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Note */}
          <p className="text-xs text-muted-foreground text-center mt-6">
            Your salon will be reviewed within 24-48 hours after submission.
          </p>
        </div>
      </div>
    </>
  );
};

export default SalonRegistration;
