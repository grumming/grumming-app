import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  UserPlus, Trash2, Search, Store, User, Loader2, X, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface Salon {
  id: string;
  name: string;
  city: string;
}

interface SalonOwner {
  id: string;
  user_id: string;
  salon_id: string;
  is_primary: boolean;
  created_at: string;
  profile?: UserProfile;
  salon?: Salon;
}

export const SalonOwnerManagement = () => {
  const { toast } = useToast();
  const [salonOwners, setSalonOwners] = useState<SalonOwner[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<SalonOwner | null>(null);
  
  // Form states
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedSalonId, setSelectedSalonId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch salon owners with related data
      const { data: ownersData, error: ownersError } = await supabase
        .from('salon_owners')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (ownersError) throw ownersError;

      // Fetch profiles for owners
      const ownerUserIds = ownersData?.map(o => o.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', ownerUserIds);

      // Fetch salons
      const { data: salonsData, error: salonsError } = await supabase
        .from('salons')
        .select('id, name, city')
        .order('name', { ascending: true });
      
      if (salonsError) throw salonsError;
      setSalons(salonsData || []);

      // Combine data
      const ownersWithDetails = ownersData?.map(owner => ({
        ...owner,
        profile: profilesData?.find(p => p.user_id === owner.user_id),
        salon: salonsData?.find(s => s.id === owner.salon_id)
      })) || [];

      setSalonOwners(ownersWithDetails);

      // Fetch all users for assignment
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      
      setUsers(allProfiles || []);

    } catch (err: any) {
      console.error('Error fetching data:', err);
      toast({ title: 'Error', description: 'Failed to fetch data', variant: 'destructive' });
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignOwner = async () => {
    if (!selectedUserId || !selectedSalonId) {
      toast({ title: 'Error', description: 'Please select a user and salon', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    try {
      // Check if already assigned
      const existingOwner = salonOwners.find(
        o => o.user_id === selectedUserId && o.salon_id === selectedSalonId
      );
      
      if (existingOwner) {
        toast({ title: 'Error', description: 'User is already an owner of this salon', variant: 'destructive' });
        setIsSaving(false);
        return;
      }

      // Add salon owner entry
      const { error: ownerError } = await supabase
        .from('salon_owners')
        .insert({
          user_id: selectedUserId,
          salon_id: selectedSalonId,
          is_primary: isPrimary
        });

      if (ownerError) throw ownerError;

      // Check if user already has salon_owner role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', selectedUserId)
        .eq('role', 'salon_owner')
        .maybeSingle();

      // Add salon_owner role if not exists
      if (!existingRole) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: selectedUserId,
            role: 'salon_owner'
          });

        if (roleError) throw roleError;
      }

      toast({ title: 'Success', description: 'Salon owner assigned successfully' });
      setIsAssignDialogOpen(false);
      resetForm();
      fetchData();

    } catch (err: any) {
      console.error('Error assigning owner:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    
    setIsSaving(false);
  };

  const handleRemoveOwner = async () => {
    if (!selectedOwner) return;

    try {
      // Remove salon owner entry
      const { error: ownerError } = await supabase
        .from('salon_owners')
        .delete()
        .eq('id', selectedOwner.id);

      if (ownerError) throw ownerError;

      // Check if user has other salons
      const { data: otherSalons } = await supabase
        .from('salon_owners')
        .select('id')
        .eq('user_id', selectedOwner.user_id)
        .neq('id', selectedOwner.id);

      // If no other salons, remove the salon_owner role
      if (!otherSalons || otherSalons.length === 0) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedOwner.user_id)
          .eq('role', 'salon_owner');

        if (roleError) throw roleError;
      }

      toast({ title: 'Success', description: 'Salon owner removed successfully' });
      setIsRemoveDialogOpen(false);
      setSelectedOwner(null);
      fetchData();

    } catch (err: any) {
      console.error('Error removing owner:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setSelectedUserId('');
    setSelectedSalonId('');
    setIsPrimary(false);
    setUserSearchQuery('');
  };

  const filteredOwners = salonOwners.filter(o => {
    const query = searchQuery.toLowerCase();
    return (
      o.profile?.full_name?.toLowerCase().includes(query) ||
      o.profile?.email?.toLowerCase().includes(query) ||
      o.profile?.phone?.includes(query) ||
      o.salon?.name.toLowerCase().includes(query) ||
      o.salon?.city.toLowerCase().includes(query)
    );
  });

  const filteredUsers = users.filter(u => {
    const query = userSearchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.phone?.includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Salon Owners</h2>
          <p className="text-sm text-muted-foreground">
            Assign users to manage salons
          </p>
        </div>
        <Button onClick={() => setIsAssignDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Assign Owner
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone, or salon..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Owners List */}
      <div className="space-y-3">
        {filteredOwners.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Crown className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium">No salon owners yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Assign users to salons to give them management access
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredOwners.map((owner) => (
            <motion.div
              key={owner.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={owner.profile?.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {owner.profile?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">
                            {owner.profile?.full_name || 'Unknown User'}
                          </p>
                          {owner.is_primary && (
                            <Badge variant="secondary" className="text-[10px]">
                              <Crown className="w-3 h-3 mr-1" />
                              Primary
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {owner.profile?.email || owner.profile?.phone}
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-xs">
                          <Store className="w-3 h-3 text-primary" />
                          <span className="text-muted-foreground">
                            {owner.salon?.name} • {owner.salon?.city}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setSelectedOwner(owner);
                        setIsRemoveDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Assign Owner Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Salon Owner</DialogTitle>
            <DialogDescription>
              Select a user and salon to grant ownership access
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* User Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select User</label>
              <Input
                placeholder="Search users..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {filteredUsers.slice(0, 10).map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className={`w-full p-2 flex items-center gap-3 hover:bg-muted/50 transition-colors ${
                      selectedUserId === user.user_id ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => setSelectedUserId(user.user_id)}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="text-xs">
                        {user.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.full_name || 'Unnamed'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email || user.phone}
                      </p>
                    </div>
                    {selectedUserId === user.user_id && (
                      <Badge variant="default" className="text-[10px]">Selected</Badge>
                    )}
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No users found
                  </p>
                )}
              </div>
            </div>

            {/* Salon Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Salon</label>
              <Select value={selectedSalonId} onValueChange={setSelectedSalonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a salon" />
                </SelectTrigger>
                <SelectContent>
                  {salons.map((salon) => (
                    <SelectItem key={salon.id} value={salon.id}>
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        <span>{salon.name}</span>
                        <span className="text-muted-foreground">• {salon.city}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Primary Owner Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Primary Owner</p>
                <p className="text-xs text-muted-foreground">
                  Has full management control
                </p>
              </div>
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="w-4 h-4"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignOwner} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign Owner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Salon Owner?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedOwner?.profile?.full_name || 'this user'} as an owner of{' '}
              {selectedOwner?.salon?.name}. They will lose access to manage this salon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveOwner}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Owner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SalonOwnerManagement;
