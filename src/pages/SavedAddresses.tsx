import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Plus, 
  MapPin, 
  Home, 
  Briefcase, 
  Heart,
  MoreVertical,
  Pencil,
  Trash2,
  Check,
  Locate,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BottomNav from "@/components/BottomNav";

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
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface AddressForm {
  label: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  latitude?: number;
  longitude?: number;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

const labelIcons: Record<string, React.ReactNode> = {
  Home: <Home className="h-4 w-4" />,
  Work: <Briefcase className="h-4 w-4" />,
  Other: <Heart className="h-4 w-4" />,
};

const labelOptions = ["Home", "Work", "Other"];

const SavedAddresses = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [form, setForm] = useState<AddressForm>({
    label: "Home",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user?.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      toast.error("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      label: "Home",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      pincode: "",
      landmark: "",
    });
    setEditingAddress(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (address: Address) => {
    setEditingAddress(address);
    setForm({
      label: address.label,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark || "",
    });
    setDialogOpen(true);
  };

  const detectCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
              },
            }
          );

          if (!response.ok) throw new Error("Failed to fetch address");

          const data = await response.json();
          const address: NominatimAddress = data.address || {};

          // Build address components
          const houseNumber = address.house_number || "";
          const road = address.road || "";
          const neighbourhood = address.neighbourhood || address.suburb || "";
          const city = address.city || address.town || address.village || "";
          const state = address.state || "";
          const pincode = address.postcode || "";

          // Construct address line 1
          const addressLine1Parts = [houseNumber, road].filter(Boolean);
          const addressLine1 = addressLine1Parts.join(" ") || neighbourhood;

          setForm((prev) => ({
            ...prev,
            address_line1: addressLine1 || prev.address_line1,
            address_line2: neighbourhood && addressLine1 !== neighbourhood ? neighbourhood : prev.address_line2,
            city: city || prev.city,
            state: state || prev.state,
            pincode: pincode.replace(/\s/g, "").slice(0, 6) || prev.pincode,
            latitude,
            longitude,
          }));

          toast.success("Location detected successfully");
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          toast.error("Could not fetch address details");
          // Still save coordinates even if reverse geocoding fails
          setForm((prev) => ({
            ...prev,
            latitude,
            longitude,
          }));
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        setDetectingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location permission denied. Please enable location access.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location information unavailable");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out");
            break;
          default:
            toast.error("An error occurred while detecting location");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSave = async () => {
    if (!form.address_line1 || !form.city || !form.state || !form.pincode) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!/^\d{6}$/.test(form.pincode)) {
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }

    setSaving(true);
    try {
      if (editingAddress) {
        const { error } = await supabase
          .from("user_addresses")
          .update({
            label: form.label,
            address_line1: form.address_line1,
            address_line2: form.address_line2 || null,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
            landmark: form.landmark || null,
          })
          .eq("id", editingAddress.id);

        if (error) throw error;
        toast.success("Address updated successfully");
      } else {
        const { error } = await supabase.from("user_addresses").insert({
          user_id: user?.id,
          label: form.label,
          address_line1: form.address_line1,
          address_line2: form.address_line2 || null,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          landmark: form.landmark || null,
          latitude: form.latitude || null,
          longitude: form.longitude || null,
          is_default: addresses.length === 0,
        });

        if (error) throw error;
        toast.success("Address added successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchAddresses();
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!addressToDelete) return;

    try {
      const { error } = await supabase
        .from("user_addresses")
        .delete()
        .eq("id", addressToDelete);

      if (error) throw error;
      toast.success("Address deleted");
      fetchAddresses();
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error("Failed to delete address");
    } finally {
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
    }
  };

  const setAsDefault = async (addressId: string) => {
    try {
      // First, remove default from all addresses
      await supabase
        .from("user_addresses")
        .update({ is_default: false })
        .eq("user_id", user?.id);

      // Then set the selected one as default
      const { error } = await supabase
        .from("user_addresses")
        .update({ is_default: true })
        .eq("id", addressId);

      if (error) throw error;
      toast.success("Default address updated");
      fetchAddresses();
    } catch (error) {
      console.error("Error setting default:", error);
      toast.error("Failed to update default address");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Saved Addresses</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Add New Address Button */}
        <Button
          onClick={openAddDialog}
          variant="outline"
          className="w-full justify-start gap-3 h-14 border-dashed"
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium">Add New Address</span>
        </Button>

        {/* Addresses List */}
        {addresses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No saved addresses yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add an address to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <Card key={address.id} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {labelIcons[address.label] || <MapPin className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{address.label}</span>
                        {address.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
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
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(address)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {!address.is_default && (
                          <DropdownMenuItem onClick={() => setAsDefault(address.id)}>
                            <Check className="h-4 w-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            setAddressToDelete(address.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? "Edit Address" : "Add New Address"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Label Selection */}
            <div className="space-y-2">
              <Label>Save as</Label>
              <div className="flex gap-2">
                {labelOptions.map((label) => (
                  <Button
                    key={label}
                    type="button"
                    variant={form.label === label ? "default" : "outline"}
                    size="sm"
                    onClick={() => setForm({ ...form, label })}
                    className="gap-2"
                  >
                    {labelIcons[label]}
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Use Current Location Button */}
            {!editingAddress && (
              <Button
                type="button"
                variant="outline"
                onClick={detectCurrentLocation}
                disabled={detectingLocation}
                className="w-full gap-2"
              >
                {detectingLocation ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Detecting location...
                  </>
                ) : (
                  <>
                    <Locate className="h-4 w-4" />
                    Use Current Location
                  </>
                )}
              </Button>
            )}

            {/* Address Line 1 */}
            <div className="space-y-2">
              <Label htmlFor="address_line1">
                Flat / House No / Building *
              </Label>
              <Input
                id="address_line1"
                value={form.address_line1}
                onChange={(e) =>
                  setForm({ ...form, address_line1: e.target.value })
                }
                placeholder="Enter flat, house no, building"
              />
            </div>

            {/* Address Line 2 */}
            <div className="space-y-2">
              <Label htmlFor="address_line2">Area / Sector / Locality</Label>
              <Input
                id="address_line2"
                value={form.address_line2}
                onChange={(e) =>
                  setForm({ ...form, address_line2: e.target.value })
                }
                placeholder="Enter area, sector, locality"
              />
            </div>

            {/* City and State */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Enter city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="Enter state"
                />
              </div>
            </div>

            {/* Pincode */}
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                value={form.pincode}
                onChange={(e) =>
                  setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })
                }
                placeholder="Enter 6-digit pincode"
                maxLength={6}
              />
            </div>

            {/* Landmark */}
            <div className="space-y-2">
              <Label htmlFor="landmark">Nearby Landmark (Optional)</Label>
              <Input
                id="landmark"
                value={form.landmark}
                onChange={(e) =>
                  setForm({ ...form, landmark: e.target.value })
                }
                placeholder="E.g., Near City Mall"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingAddress ? "Update" : "Save Address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              saved address.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default SavedAddresses;
