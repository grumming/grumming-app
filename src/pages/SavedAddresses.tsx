import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, MapPin, Home, Briefcase, Heart, MoreVertical, 
  Edit2, Trash2, Check, Loader2, Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Address {
  id: string;
  user_id: string;
  label: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean | null;
  created_at: string;
}

const addressLabels = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'work', label: 'Work', icon: Briefcase },
  { id: 'other', label: 'Other', icon: Heart },
];

const SavedAddresses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [selectedLabel, setSelectedLabel] = useState('home');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching addresses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load addresses',
        variant: 'destructive',
      });
    } else {
      setAddresses(data || []);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setSelectedLabel('home');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('');
    setPincode('');
    setLandmark('');
    setIsDefault(false);
    setEditingAddress(null);
  };

  const openAddDialog = () => {
    resetForm();
    if (addresses.length === 0) {
      setIsDefault(true);
    }
    setIsDialogOpen(true);
  };

  const openEditDialog = (address: Address) => {
    setEditingAddress(address);
    setSelectedLabel(address.label.toLowerCase());
    setAddressLine1(address.address_line1);
    setAddressLine2(address.address_line2 || '');
    setCity(address.city);
    setState(address.state);
    setPincode(address.pincode);
    setLandmark(address.landmark || '');
    setIsDefault(address.is_default || false);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!addressLine1.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    // If setting as default, unset other defaults first
    if (isDefault) {
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    const addressData = {
      user_id: user.id,
      label: addressLabels.find(l => l.id === selectedLabel)?.label || 'Other',
      address_line1: addressLine1.trim(),
      address_line2: addressLine2.trim() || null,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      landmark: landmark.trim() || null,
      is_default: isDefault,
    };

    if (editingAddress) {
      const { error } = await supabase
        .from('user_addresses')
        .update(addressData)
        .eq('id', editingAddress.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update address',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Address updated',
          description: 'Your address has been updated successfully',
        });
      }
    } else {
      const { error } = await supabase
        .from('user_addresses')
        .insert(addressData);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to add address',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Address added',
          description: 'Your new address has been saved',
        });
      }
    }

    setIsSaving(false);
    setIsDialogOpen(false);
    resetForm();
    fetchAddresses();
  };

  const handleDelete = async (addressId: string) => {
    const { error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', addressId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete address',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Address deleted',
        description: 'Address has been removed',
      });
      fetchAddresses();
    }
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user) return;

    await supabase
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', user.id);

    await supabase
      .from('user_addresses')
      .update({ is_default: true })
      .eq('id', addressId);

    toast({
      title: 'Default address updated',
    });
    fetchAddresses();
  };

  const getLabelIcon = (label: string) => {
    const found = addressLabels.find(l => l.label.toLowerCase() === label.toLowerCase());
    return found?.icon || MapPin;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-display text-lg font-semibold text-foreground">Saved Addresses</h1>
          </div>
          <Button onClick={openAddDialog} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add New
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-3">
        {addresses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Navigation className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No saved addresses</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your addresses for quick checkout
            </p>
            <Button onClick={openAddDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Address
            </Button>
          </motion.div>
        ) : (
          <AnimatePresence>
            {addresses.map((address, index) => {
              const LabelIcon = getLabelIcon(address.label);
              return (
                <motion.div
                  key={address.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-card rounded-xl border p-4 ${
                    address.is_default ? 'border-primary/50 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      address.is_default ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <LabelIcon className={`w-5 h-5 ${
                        address.is_default ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{address.label}</span>
                        {address.is_default && (
                          <span className="text-[10px] font-medium bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {address.address_line1}
                        {address.address_line2 && `, ${address.address_line2}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {address.city}, {address.state} - {address.pincode}
                      </p>
                      {address.landmark && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Near: {address.landmark}
                        </p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(address)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {!address.is_default && (
                          <DropdownMenuItem onClick={() => handleSetDefault(address.id)}>
                            <Check className="w-4 h-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleDelete(address.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Add/Edit Address Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </DialogTitle>
            <DialogDescription>
              {editingAddress ? 'Update your address details' : 'Enter your new address details'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Label Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Save as</Label>
              <div className="flex gap-2">
                {addressLabels.map((labelOption) => (
                  <button
                    key={labelOption.id}
                    onClick={() => setSelectedLabel(labelOption.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all ${
                      selectedLabel === labelOption.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    <labelOption.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{labelOption.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Address Fields */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="addressLine1" className="text-xs text-muted-foreground">
                  Flat / House No / Building *
                </Label>
                <Input
                  id="addressLine1"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g., 123, Sunrise Apartments"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="addressLine2" className="text-xs text-muted-foreground">
                  Area / Sector / Locality
                </Label>
                <Input
                  id="addressLine2"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="e.g., Sector 15, Koramangala"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs text-muted-foreground">City *</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g., Bangalore"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-xs text-muted-foreground">State *</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g., Karnataka"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pincode" className="text-xs text-muted-foreground">Pincode *</Label>
                  <Input
                    id="pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="e.g., 560001"
                    maxLength={6}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="landmark" className="text-xs text-muted-foreground">Landmark</Label>
                  <Input
                    id="landmark"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g., Near Metro"
                  />
                </div>
              </div>
            </div>

            {/* Default Checkbox */}
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">Set as default address</span>
            </label>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                editingAddress ? 'Update Address' : 'Save Address'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default SavedAddresses;
