import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, AlertTriangle, CheckCircle2, DollarSign, TrendingUp, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CancellationPenalty {
  id: string;
  user_id: string;
  booking_id: string;
  penalty_amount: number;
  penalty_percentage: number;
  original_service_price: number;
  salon_name: string;
  service_name: string;
  is_paid: boolean;
  is_waived: boolean;
  paid_at: string | null;
  waived_at: string | null;
  waived_reason: string | null;
  paid_booking_id: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    phone: string | null;
  };
}

export function CancellationPenaltyManagement() {
  const { toast } = useToast();
  const [penalties, setPenalties] = useState<CancellationPenalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'waived'>('all');
  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState<CancellationPenalty | null>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [waiving, setWaiving] = useState(false);

  useEffect(() => {
    fetchPenalties();
  }, []);

  const fetchPenalties = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('cancellation_penalties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch penalties',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Fetch profiles for users
    const userIds = [...new Set((data || []).map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, phone')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const penaltiesWithProfiles = (data || []).map(penalty => ({
      ...penalty,
      profile: profileMap.get(penalty.user_id),
    }));

    setPenalties(penaltiesWithProfiles);
    setLoading(false);
  };

  const handleMarkAsPaid = async (penaltyId: string) => {
    const { error } = await supabase
      .from('cancellation_penalties')
      .update({ 
        is_paid: true, 
        paid_at: new Date().toISOString() 
      })
      .eq('id', penaltyId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update penalty',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Penalty Marked as Paid',
      description: 'The penalty has been marked as paid.',
    });
    
    fetchPenalties();
  };

  const openWaiveDialog = (penalty: CancellationPenalty) => {
    setSelectedPenalty(penalty);
    setWaiveReason('');
    setWaiveDialogOpen(true);
  };

  const handleWaivePenalty = async () => {
    if (!selectedPenalty) return;
    
    setWaiving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('cancellation_penalties')
      .update({ 
        is_waived: true,
        waived_at: new Date().toISOString(),
        waived_by: user?.id,
        waived_reason: waiveReason || 'Admin waived penalty'
      })
      .eq('id', selectedPenalty.id);

    setWaiving(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to waive penalty',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Penalty Waived',
      description: `₹${selectedPenalty.penalty_amount} penalty waived for ${selectedPenalty.profile?.full_name || 'user'}.`,
    });
    
    setWaiveDialogOpen(false);
    setSelectedPenalty(null);
    fetchPenalties();
  };

  const filteredPenalties = penalties.filter(penalty => {
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'pending' && !penalty.is_paid && !penalty.is_waived) ||
      (filter === 'paid' && penalty.is_paid) ||
      (filter === 'waived' && penalty.is_waived);

    const matchesSearch = 
      !searchQuery ||
      penalty.salon_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      penalty.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      penalty.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      penalty.profile?.phone?.includes(searchQuery);

    return matchesFilter && matchesSearch;
  });

  const totalPending = penalties.filter(p => !p.is_paid && !p.is_waived).reduce((sum, p) => sum + Number(p.penalty_amount), 0);
  const totalCollected = penalties.filter(p => p.is_paid).reduce((sum, p) => sum + Number(p.penalty_amount), 0);
  const totalWaived = penalties.filter(p => p.is_waived).reduce((sum, p) => sum + Number(p.penalty_amount), 0);
  const pendingCount = penalties.filter(p => !p.is_paid && !p.is_waived).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Pending Penalties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600 font-sans">₹{totalPending.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{pendingCount} users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 font-sans">₹{totalCollected.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{penalties.filter(p => p.is_paid).length} penalties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="w-4 h-4 text-blue-500" />
              Waived
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 font-sans">₹{totalWaived.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{penalties.filter(p => p.is_waived).length} penalties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Total Penalties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-sans">₹{(totalPending + totalCollected + totalWaived).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{penalties.length} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by salon, service, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            Pending
          </Button>
          <Button
            variant={filter === 'paid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('paid')}
          >
            Paid
          </Button>
          <Button
            variant={filter === 'waived' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('waived')}
          >
            Waived
          </Button>
        </div>
      </div>

      {/* Penalties Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Cancellation Penalties ({filteredPenalties.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPenalties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No penalties found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Salon</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Original Price</TableHead>
                    <TableHead className="text-right">Penalty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPenalties.map((penalty) => (
                    <TableRow key={penalty.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{penalty.profile?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{penalty.profile?.phone || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>{penalty.salon_name}</TableCell>
                      <TableCell>{penalty.service_name}</TableCell>
                      <TableCell className="text-right font-sans">₹{penalty.original_service_price}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold font-sans ${penalty.is_waived ? 'line-through text-muted-foreground' : 'text-red-600'}`}>
                          ₹{penalty.penalty_amount}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({penalty.penalty_percentage}%)
                        </span>
                      </TableCell>
                      <TableCell>
                        {penalty.is_waived ? (
                          <Badge className="bg-blue-500">Waived</Badge>
                        ) : penalty.is_paid ? (
                          <Badge className="bg-green-500">Paid</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(parseISO(penalty.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {!penalty.is_paid && !penalty.is_waived && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkAsPaid(penalty.id)}
                            >
                              Mark Paid
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => openWaiveDialog(penalty)}
                            >
                              Waive
                            </Button>
                          </div>
                        )}
                        {penalty.is_paid && penalty.paid_at && (
                          <span className="text-xs text-muted-foreground">
                            Paid {format(parseISO(penalty.paid_at), 'MMM d')}
                          </span>
                        )}
                        {penalty.is_waived && penalty.waived_at && (
                          <div className="text-xs text-muted-foreground">
                            <p>Waived {format(parseISO(penalty.waived_at), 'MMM d')}</p>
                            {penalty.waived_reason && (
                              <p className="italic truncate max-w-[150px]" title={penalty.waived_reason}>
                                {penalty.waived_reason}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waive Confirmation Dialog */}
      <AlertDialog open={waiveDialogOpen} onOpenChange={setWaiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Waive Cancellation Penalty?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to waive the ₹{selectedPenalty?.penalty_amount} penalty for{' '}
                  <strong>{selectedPenalty?.profile?.full_name || 'this user'}</strong>.
                </p>
                <p className="text-sm">
                  This action cannot be undone. The user will no longer need to pay this penalty on their next booking.
                </p>
                <div className="pt-2">
                  <label className="text-sm font-medium text-foreground">
                    Reason for waiving (optional)
                  </label>
                  <Textarea
                    placeholder="e.g., First-time customer, technical issue, customer complaint..."
                    value={waiveReason}
                    onChange={(e) => setWaiveReason(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={waiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWaivePenalty}
              disabled={waiving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {waiving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Waiving...
                </>
              ) : (
                'Waive Penalty'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}