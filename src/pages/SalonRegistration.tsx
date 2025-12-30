import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Store, MapPin, Clock, Phone, Mail, Image, Loader2, CheckCircle, Camera, X, Upload } from 'lucide-react';
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

const salonSchema = z.object({
  name: z.string().min(2, 'Salon name must be at least 2 characters').max(100),
  location: z.string().min(5, 'Please enter a valid address').max(200),
  city: z.string().min(1, 'Please select a city'),
  description: z.string().max(500).optional(),
  phone: z.string().regex(/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number').optional().or(z.literal('')),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  openingTime: z.string(),
  closingTime: z.string(),
});

type SalonFormData = z.infer<typeof salonSchema>;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const SalonRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<SalonFormData>({
    name: '',
    location: '',
    city: '',
    description: '',
    phone: '',
    email: '',
    openingTime: '09:00',
    closingTime: '21:00',
  });

  const updateField = (field: keyof SalonFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    try {
      salonSchema.parse(formData);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, or WebP image',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (salonId: string): Promise<string | null> => {
    if (!selectedImage) return null;
    
    setIsUploadingImage(true);
    
    try {
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${salonId}/main.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('salon-images')
        .upload(fileName, selectedImage, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('salon-images')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast({
        title: 'Image upload failed',
        description: 'Salon registered but image upload failed. You can add it later.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
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
      // Create the salon first
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
          is_active: false, // Pending admin approval
        })
        .select()
        .single();

      if (salonError) throw salonError;

      // Upload image if selected
      if (selectedImage) {
        const imageUrl = await uploadImage(salonData.id);
        if (imageUrl) {
          await supabase
            .from('salons')
            .update({ image_url: imageUrl })
            .eq('id', salonData.id);
        }
      }

      // Link the user as salon owner
      const { error: ownerError } = await supabase
        .from('salon_owners')
        .insert({
          user_id: user.id,
          salon_id: salonData.id,
          is_primary: true,
        });

      if (ownerError) throw ownerError;

      // Assign salon_owner role if not already assigned
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

      setStep('success');
      
      toast({
        title: 'Salon Registered!',
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Register Your Salon</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-2xl mx-auto">
        {step === 'form' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Intro */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Tell us about your salon</h2>
              <p className="text-sm text-muted-foreground">
                Fill in the details below to register your salon on Grumming
              </p>
            </div>

            {/* Form */}
            <div className="space-y-5">
              {/* Salon Image Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Salon Photo
                </Label>
                <div className="flex items-start gap-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Salon preview"
                        className="w-32 h-32 object-cover rounded-xl border border-border"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-32 h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload</span>
                    </button>
                  )}
                  <div className="flex-1 pt-2">
                    <p className="text-sm text-muted-foreground">
                      Add a photo of your salon to attract more customers
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPEG, PNG or WebP • Max 5MB
                    </p>
                    {imagePreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-3"
                      >
                        Change Photo
                      </Button>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Salon Name */}
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

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address *
                </Label>
                <Textarea
                  id="location"
                  value={formData.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="Full address of your salon"
                  rows={2}
                  className={errors.location ? 'border-destructive' : ''}
                />
                {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label>City *</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => updateField('city', value)}
                >
                  <SelectTrigger className={errors.city ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select city" />
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

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Tell customers about your salon, services, and specialties"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.description?.length || 0}/500
                </p>
              </div>

              {/* Operating Hours */}
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

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
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
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
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

              {/* Info Note */}
              <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> Your salon will be reviewed by our team before it goes live. 
                  You can add more photos and services from your Salon Dashboard after approval.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={isLoading || isUploadingImage}
                className="w-full h-12"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isUploadingImage ? 'Uploading image...' : 'Registering...'}
                  </>
                ) : (
                  'Register Salon'
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Registration Submitted!</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Your salon has been submitted for review. Our team will verify your details and activate your salon within 24-48 hours.
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate('/salon-dashboard')} className="w-full max-w-xs">
                Go to Salon Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full max-w-xs">
                Return to Home
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default SalonRegistration;
