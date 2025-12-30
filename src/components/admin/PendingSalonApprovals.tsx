import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, MapPin, Phone, Mail, Clock, CheckCircle, XCircle, 
  Loader2, User, AlertTriangle, Eye, Calendar, Filter, X, Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
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
import { format, subDays, isBefore, startOfDay } from 'date-fns';
import { getDisplayContact } from '@/utils/displayUtils';

interface PendingSalon {
  id: string;
  name: string;
  location: string;
  city: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  opening_time: string;
  closing_time: string;
  created_at: string;
  owner?: {
    user_id: string;
    full_name: string | null;
    phone: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export const PendingSalonApprovals = () => {
  const { toast } = useToast();
  const [pendingSalons, setPendingSalons] = useState<PendingSalon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSalon, setSelectedSalon] = useState<PendingSalon | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filter states
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique cities from pending salons
  const uniqueCities = useMemo(() => {
    const cities = [...new Set(pendingSalons.map(s => s.city))].sort();
    return cities;
  }, [pendingSalons]);

  // Filter pending salons
  const filteredSalons = useMemo(() => {
    return pendingSalons.filter(salon => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSalonName = salon.name.toLowerCase().includes(query);
        const matchesOwnerName = salon.owner?.full_name?.toLowerCase().includes(query);
        const matchesOwnerPhone = salon.owner?.phone?.includes(query);
        const matchesOwnerEmail = salon.owner?.email?.toLowerCase().includes(query);
        
        if (!matchesSalonName && !matchesOwnerName && !matchesOwnerPhone && !matchesOwnerEmail) {
          return false;
        }
      }
      
      // City filter
      if (cityFilter !== 'all' && salon.city !== cityFilter) {
        return false;
      }
      
      // Date filter
      if (dateFilter !== 'all') {
        const salonDate = new Date(salon.created_at);
        const today = startOfDay(new Date());
        
        switch (dateFilter) {
          case 'today':
            if (isBefore(salonDate, today)) return false;
            break;
          case 'week':
            if (isBefore(salonDate, subDays(today, 7))) return false;
            break;
          case 'month':
            if (isBefore(salonDate, subDays(today, 30))) return false;
            break;
        }
      }
      
      return true;
    });
  }, [pendingSalons, cityFilter, dateFilter, searchQuery]);

  const hasActiveFilters = cityFilter !== 'all' || dateFilter !== 'all' || searchQuery.trim() !== '';

  const clearFilters = () => {
    setCityFilter('all');
    setDateFilter('all');
    setSearchQuery('');
  };

  const fetchPendingSalons = async () => {
    setIsLoading(true);
    try {
      // Fetch inactive salons (pending approval)
      const { data: salonsData, error: salonsError } = await supabase
        .from('salons')
        .select('*')
        .eq('is_active', false)
        .order('created_at', { ascending: false });

      if (salonsError) throw salonsError;

      // Fetch owner information for each salon
      const salonsWithOwners: PendingSalon[] = [];
      
      for (const salon of salonsData || []) {
        const { data: ownerData } = await supabase
          .from('salon_owners')
          .select('user_id')
          .eq('salon_id', salon.id)
          .eq('is_primary', true)
          .maybeSingle();

        let owner = undefined;
        if (ownerData) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, phone, email, avatar_url')
            .eq('user_id', ownerData.user_id)
            .maybeSingle();

          if (profileData) {
            owner = {
              user_id: ownerData.user_id,
              ...profileData
            };
          }
        }

        salonsWithOwners.push({
          ...salon,
          owner
        });
      }

      setPendingSalons(salonsWithOwners);
    } catch (error: any) {
      console.error('Error fetching pending salons:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending salons',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSalons();
  }, []);

  const handleApprove = async () => {
    if (!selectedSalon) return;
    
    setIsProcessing(true);
    try {
      // Activate the salon
      const { error: updateError } = await supabase
        .from('salons')
        .update({ is_active: true })
        .eq('id', selectedSalon.id);

      if (updateError) throw updateError;

      // Send notification to owner if exists
      if (selectedSalon.owner) {
        // In-app notification
        await supabase
          .from('notifications')
          .insert({
            user_id: selectedSalon.owner.user_id,
            title: '🎉 Salon Approved!',
            message: `Great news! Your salon "${selectedSalon.name}" has been approved and is now live on Grumming.`,
            type: 'salon',
            link: '/salon-dashboard'
          });

        // Push notification
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: selectedSalon.owner.user_id,
              title: '🎉 Salon Approved!',
              body: `Great news! Your salon "${selectedSalon.name}" has been approved and is now live.`,
              data: { type: 'salon_approved', link: '/salon-dashboard' }
            }
          });
        } catch (pushError) {
          console.log('Push notification failed:', pushError);
          // Don't fail the approval if push fails
        }
      }

      toast({
        title: 'Salon Approved',
        description: `${selectedSalon.name} is now live on Grumming.`
      });

      setIsApproveDialogOpen(false);
      setSelectedSalon(null);
      fetchPendingSalons();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve salon',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSalon) return;
    
    setIsProcessing(true);
    try {
      // Delete the salon_owners entry first
      await supabase
        .from('salon_owners')
        .delete()
        .eq('salon_id', selectedSalon.id);

      // Delete the salon
      const { error: deleteError } = await supabase
        .from('salons')
        .delete()
        .eq('id', selectedSalon.id);

      if (deleteError) throw deleteError;

      // Send notification to owner if exists
      if (selectedSalon.owner) {
        const rejectionMessage = rejectionReason 
          ? `Your salon "${selectedSalon.name}" registration was not approved. Reason: ${rejectionReason}`
          : `Your salon "${selectedSalon.name}" registration was not approved. Please contact support for more details.`;

        // In-app notification
        await supabase
          .from('notifications')
          .insert({
            user_id: selectedSalon.owner.user_id,
            title: 'Salon Registration Update',
            message: rejectionMessage,
            type: 'salon',
            link: '/salon-registration'
          });

        // Push notification
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: selectedSalon.owner.user_id,
              title: 'Salon Registration Update',
              body: rejectionReason 
                ? `Your salon "${selectedSalon.name}" was not approved: ${rejectionReason}`
                : `Your salon "${selectedSalon.name}" was not approved. Contact support for details.`,
              data: { type: 'salon_rejected', link: '/salon-registration' }
            }
          });
        } catch (pushError) {
          console.log('Push notification failed:', pushError);
          // Don't fail the rejection if push fails
        }
      }

      toast({
        title: 'Salon Rejected',
        description: 'The salon registration has been rejected.'
      });

      setIsRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedSalon(null);
      fetchPendingSalons();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject salon',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openDetailDialog = (salon: PendingSalon) => {
    setSelectedSalon(salon);
    setIsDetailDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (pendingSalons.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
          <p className="text-muted-foreground">No pending salon registrations to review.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Pending Approvals</h3>
          <p className="text-sm text-muted-foreground">
            {filteredSalons.length} of {pendingSalons.length} salon{pendingSalons.length !== 1 ? 's' : ''} shown
          </p>
        </div>
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 w-fit">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {pendingSalons.length} Pending
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search salon or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {uniqueCities.map(city => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Any Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Date</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="h-9 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* No results after filtering */}
      {filteredSalons.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Filter className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-1">No matching salons</h3>
            <p className="text-sm text-muted-foreground mb-3">
              No pending salons match your current filters.
            </p>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <AnimatePresence>
          {filteredSalons.map((salon, index) => (
            <motion.div
              key={salon.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Salon Icon */}
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Store className="w-6 h-6 text-primary" />
                    </div>

                    {/* Salon Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold truncate">{salon.name}</h4>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{salon.location}, {salon.city}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 flex-shrink-0">
                          Pending
                        </Badge>
                      </div>

                      {/* Owner Info */}
                      {salon.owner && (
                        <div className="flex items-center gap-2 mt-3 p-2 bg-muted/50 rounded-lg">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={salon.owner.avatar_url || ''} />
                            <AvatarFallback>
                              {salon.owner.full_name?.charAt(0) || 'O'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {salon.owner.full_name || 'Unknown Owner'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {getDisplayContact(salon.owner.phone, salon.owner.email)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Submitted Date */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Calendar className="w-3 h-3" />
                        Submitted {format(new Date(salon.created_at), 'MMM d, yyyy')}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetailDialog(salon)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSelectedSalon(salon);
                            setIsApproveDialogOpen(true);
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedSalon(salon);
                            setIsRejectDialogOpen(true);
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Salon Details</DialogTitle>
            <DialogDescription>Review the salon registration details</DialogDescription>
          </DialogHeader>
          
          {selectedSalon && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Store className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedSalon.name}</h3>
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                    Pending Approval
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{selectedSalon.location}, {selectedSalon.city}</p>
                  </div>
                </div>

                {selectedSalon.description && (
                  <div className="flex items-start gap-3">
                    <Store className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm text-muted-foreground">{selectedSalon.description}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Operating Hours</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSalon.opening_time} - {selectedSalon.closing_time}
                    </p>
                  </div>
                </div>

                {selectedSalon.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{selectedSalon.phone}</p>
                    </div>
                  </div>
                )}

                {selectedSalon.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{selectedSalon.email}</p>
                    </div>
                  </div>
                )}

                {selectedSalon.owner && (
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Owner</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={selectedSalon.owner.avatar_url || ''} />
                          <AvatarFallback>{selectedSalon.owner.full_name?.charAt(0) || 'O'}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">
                          {selectedSalon.owner.full_name || 'Unknown'} • {getDisplayContact(selectedSalon.owner.phone, selectedSalon.owner.email)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Submitted</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedSalon.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    setIsRejectDialogOpen(true);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    setIsApproveDialogOpen(true);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Salon?</AlertDialogTitle>
            <AlertDialogDescription>
              This will activate "{selectedSalon?.name}" and make it visible to customers on Grumming.
              The owner will be notified of the approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Salon Registration?</DialogTitle>
            <DialogDescription>
              This will permanently delete "{selectedSalon?.name}" registration. 
              The owner will be notified.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Rejection Reason (optional)</label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide a reason for rejection..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingSalonApprovals;
