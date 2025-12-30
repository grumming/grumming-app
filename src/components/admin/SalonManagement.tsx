import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit2, Trash2, Search, Store, MapPin, Phone, Mail,
  Clock, Star, Eye, EyeOff, Loader2, X, Save, ChevronDown,
  ChevronUp, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Salon {
  id: string;
  name: string;
  location: string;
  city: string;
  image_url: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  rating: number;
  total_reviews: number;
  is_active: boolean;
  opening_time: string;
  closing_time: string;
  created_at: string;
}

interface SalonService {
  id: string;
  salon_id: string;
  name: string;
  price: number;
  duration: string;
  category: string;
  description: string | null;
  is_active: boolean;
}

const SERVICE_CATEGORIES = [
  'Haircut', 'Hair', 'Color', 'Makeup', 'Spa', 'Massage', 
  'Skincare', 'Nails', 'Waxing', 'Threading', 'Grooming', 
  'Treatment', 'Bridal', 'Body', 'Aromatherapy'
];

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Patna', 'Gaya',
  'Muzaffarpur', 'Bhagalpur', 'Chakia', 'Ranchi', 'Bhopal', 'Indore'
];

export const SalonManagement = () => {
  const { toast } = useToast();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isServicesDialogOpen, setIsServicesDialogOpen] = useState(false);
  
  // Form states
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    city: '',
    image_url: '',
    description: '',
    phone: '',
    email: '',
    opening_time: '09:00',
    closing_time: '21:00',
    is_active: true
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Services state
  const [services, setServices] = useState<SalonService[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [expandedSalon, setExpandedSalon] = useState<string | null>(null);
  
  // Service form
  const [isAddServiceDialogOpen, setIsAddServiceDialogOpen] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    price: 49,
    duration: '30 min',
    category: 'Haircut',
    description: '',
    is_active: true
  });

  const fetchSalons = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('salons')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch salons', variant: 'destructive' });
    } else {
      setSalons(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSalons();
  }, []);

  const fetchServices = async (salonId: string) => {
    setIsLoadingServices(true);
    const { data, error } = await supabase
      .from('salon_services')
      .select('*')
      .eq('salon_id', salonId)
      .order('category', { ascending: true });
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch services', variant: 'destructive' });
    } else {
      setServices(data || []);
    }
    setIsLoadingServices(false);
  };

  const handleAddSalon = async () => {
    if (!formData.name || !formData.location || !formData.city) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('salons')
      .insert({
        name: formData.name,
        location: formData.location,
        city: formData.city,
        image_url: formData.image_url || null,
        description: formData.description || null,
        phone: formData.phone || null,
        email: formData.email || null,
        opening_time: formData.opening_time,
        closing_time: formData.closing_time,
        is_active: formData.is_active
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Salon added successfully' });
      setIsAddDialogOpen(false);
      resetForm();
      fetchSalons();
    }
    setIsSaving(false);
  };

  const handleUpdateSalon = async () => {
    if (!selectedSalon) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('salons')
      .update({
        name: formData.name,
        location: formData.location,
        city: formData.city,
        image_url: formData.image_url || null,
        description: formData.description || null,
        phone: formData.phone || null,
        email: formData.email || null,
        opening_time: formData.opening_time,
        closing_time: formData.closing_time,
        is_active: formData.is_active
      })
      .eq('id', selectedSalon.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Salon updated successfully' });
      setIsEditDialogOpen(false);
      resetForm();
      fetchSalons();
    }
    setIsSaving(false);
  };

  const handleDeleteSalon = async () => {
    if (!selectedSalon) return;

    const { error } = await supabase
      .from('salons')
      .delete()
      .eq('id', selectedSalon.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Salon deleted successfully' });
      setIsDeleteDialogOpen(false);
      setSelectedSalon(null);
      fetchSalons();
    }
  };

  const handleToggleActive = async (salon: Salon) => {
    const { error } = await supabase
      .from('salons')
      .update({ is_active: !salon.is_active })
      .eq('id', salon.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ 
        title: 'Success', 
        description: `Salon ${salon.is_active ? 'deactivated' : 'activated'} successfully` 
      });
      fetchSalons();
    }
  };

  const handleAddService = async () => {
    if (!selectedSalon || !serviceFormData.name) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('salon_services')
      .insert({
        salon_id: selectedSalon.id,
        name: serviceFormData.name,
        price: serviceFormData.price,
        duration: serviceFormData.duration,
        category: serviceFormData.category,
        description: serviceFormData.description || null,
        is_active: serviceFormData.is_active
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Service added successfully' });
      setIsAddServiceDialogOpen(false);
      resetServiceForm();
      fetchServices(selectedSalon.id);
    }
    setIsSaving(false);
  };

  const handleDeleteService = async (serviceId: string) => {
    const { error } = await supabase
      .from('salon_services')
      .delete()
      .eq('id', serviceId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Service deleted successfully' });
      if (selectedSalon) {
        fetchServices(selectedSalon.id);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      city: '',
      image_url: '',
      description: '',
      phone: '',
      email: '',
      opening_time: '09:00',
      closing_time: '21:00',
      is_active: true
    });
    setSelectedSalon(null);
  };

  const resetServiceForm = () => {
    setServiceFormData({
      name: '',
      price: 49,
      duration: '30 min',
      category: 'Haircut',
      description: '',
      is_active: true
    });
  };

  const openEditDialog = (salon: Salon) => {
    setSelectedSalon(salon);
    setFormData({
      name: salon.name,
      location: salon.location,
      city: salon.city,
      image_url: salon.image_url || '',
      description: salon.description || '',
      phone: salon.phone || '',
      email: salon.email || '',
      opening_time: salon.opening_time,
      closing_time: salon.closing_time,
      is_active: salon.is_active
    });
    setIsEditDialogOpen(true);
  };

  const openServicesDialog = (salon: Salon) => {
    setSelectedSalon(salon);
    fetchServices(salon.id);
    setIsServicesDialogOpen(true);
  };

  const filteredSalons = salons.filter(s => {
    const query = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(query) ||
           s.location.toLowerCase().includes(query) ||
           s.city.toLowerCase().includes(query);
  });

  const SalonForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Salon Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter salon name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Select value={formData.city} onValueChange={(v) => setFormData({ ...formData, city: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              {INDIAN_CITIES.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location / Area *</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="e.g., Bandra West, Koramangala"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image_url">Image URL</Label>
        <Input
          id="image_url"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the salon"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+91 XXXXX XXXXX"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="salon@example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="opening_time">Opening Time</Label>
          <Input
            id="opening_time"
            type="time"
            value={formData.opening_time}
            onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="closing_time">Closing Time</Label>
          <Input
            id="closing_time"
            type="time"
            value={formData.closing_time}
            onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active">Active (visible to customers)</Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search salons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Salon
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{salons.length}</div>
            <div className="text-sm text-muted-foreground">Total Salons</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {salons.filter(s => s.is_active).length}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">
              {salons.filter(s => !s.is_active).length}
            </div>
            <div className="text-sm text-muted-foreground">Inactive</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {new Set(salons.map(s => s.city)).size}
            </div>
            <div className="text-sm text-muted-foreground">Cities</div>
          </CardContent>
        </Card>
      </div>

      {/* Salons List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredSalons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No salons found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'Try a different search term' : 'Add your first salon to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Salon
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSalons.map((salon) => (
            <motion.div
              key={salon.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border rounded-lg overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {salon.image_url ? (
                      <img src={salon.image_url} alt={salon.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Store className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold truncate">{salon.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{salon.location}, {salon.city}</span>
                        </div>
                      </div>
                      <Badge variant={salon.is_active ? 'default' : 'secondary'}>
                        {salon.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {salon.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {salon.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {salon.opening_time?.slice(0, 5)} - {salon.closing_time?.slice(0, 5)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {salon.rating} ({salon.total_reviews} reviews)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => openServicesDialog(salon)}>
                    <Package className="w-4 h-4 mr-1" />
                    Services
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(salon)}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleToggleActive(salon)}
                  >
                    {salon.is_active ? (
                      <><EyeOff className="w-4 h-4 mr-1" />Hide</>
                    ) : (
                      <><Eye className="w-4 h-4 mr-1" />Show</>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => { setSelectedSalon(salon); setIsDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Salon Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Salon</DialogTitle>
            <DialogDescription>Fill in the details to add a new salon listing.</DialogDescription>
          </DialogHeader>
          <SalonForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSalon} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Add Salon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Salon Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Salon</DialogTitle>
            <DialogDescription>Update salon information.</DialogDescription>
          </DialogHeader>
          <SalonForm isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateSalon} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Salon?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedSalon?.name}" and all its services. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSalon} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Services Dialog */}
      <Dialog open={isServicesDialogOpen} onOpenChange={setIsServicesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Services - {selectedSalon?.name}</DialogTitle>
            <DialogDescription>Add and manage services for this salon.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <Button size="sm" onClick={() => setIsAddServiceDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>

            {isLoadingServices ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No services added yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {services.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{service.name}</span>
                        <Badge variant="outline" className="text-xs">{service.category}</Badge>
                        {!service.is_active && <Badge variant="secondary" className="text-xs">Hidden</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ₹{service.price} • {service.duration}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive"
                      onClick={() => handleDeleteService(service.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Service Dialog */}
      <Dialog open={isAddServiceDialogOpen} onOpenChange={setIsAddServiceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
            <DialogDescription>Add a new service to {selectedSalon?.name}.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service_name">Service Name *</Label>
              <Input
                id="service_name"
                value={serviceFormData.name}
                onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                placeholder="e.g., Haircut & Styling"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service_price">Price (₹)</Label>
                <Input
                  id="service_price"
                  type="number"
                  value={serviceFormData.price}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, price: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_duration">Duration</Label>
                <Input
                  id="service_duration"
                  value={serviceFormData.duration}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, duration: e.target.value })}
                  placeholder="e.g., 30 min"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_category">Category</Label>
              <Select 
                value={serviceFormData.category} 
                onValueChange={(v) => setServiceFormData({ ...serviceFormData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_description">Description</Label>
              <Textarea
                id="service_description"
                value={serviceFormData.description}
                onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="service_is_active"
                checked={serviceFormData.is_active}
                onCheckedChange={(checked) => setServiceFormData({ ...serviceFormData, is_active: checked })}
              />
              <Label htmlFor="service_is_active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddServiceDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddService} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalonManagement;