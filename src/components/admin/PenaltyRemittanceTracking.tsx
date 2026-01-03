import { useState, useEffect } from 'react';
import { 
  Store, AlertCircle, CheckCircle, Clock, RefreshCw,
  ArrowDownToLine, IndianRupee, Calendar, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SalonPendingPenalties {
  salon_id: string;
  salon_name: string;
  salon_image: string | null;
  pending_count: number;
  pending_amount: number;
  penalties: {
    id: string;
    penalty_amount: number;
    salon_name: string;
    service_name: string;
    paid_at: string | null;
    user_id: string;
  }[];
}

interface RemittanceRecord {
  id: string;
  salon_id: string;
  payout_id: string | null;
  penalty_ids: string[];
  total_amount: number;
  created_at: string;
  salon?: { name: string };
}

const PenaltyRemittanceTracking = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [pendingBySalon, setPendingBySalon] = useState<SalonPendingPenalties[]>([]);
  const [remittanceHistory, setRemittanceHistory] = useState<RemittanceRecord[]>([]);
  const [selectedSalon, setSelectedSalon] = useState<SalonPendingPenalties | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch unremitted penalties grouped by salon
      const { data: penalties, error: penaltiesError } = await supabase
        .from('cancellation_penalties')
        .select(`
          id,
          penalty_amount,
          salon_name,
          service_name,
          paid_at,
          user_id,
          collecting_salon_id,
          salon:salons!cancellation_penalties_collecting_salon_id_fkey(id, name, image_url)
        `)
        .eq('is_paid', true)
        .eq('remitted_to_platform', false)
        .eq('is_waived', false)
        .not('collecting_salon_id', 'is', null);

      if (penaltiesError) throw penaltiesError;

      // Group by salon
      const salonMap = new Map<string, SalonPendingPenalties>();
      
      (penalties || []).forEach((penalty: any) => {
        if (!penalty.collecting_salon_id) return;
        
        const existing = salonMap.get(penalty.collecting_salon_id);
        const penaltyData = {
          id: penalty.id,
          penalty_amount: penalty.penalty_amount,
          salon_name: penalty.salon_name,
          service_name: penalty.service_name,
          paid_at: penalty.paid_at,
          user_id: penalty.user_id
        };
        
        if (existing) {
          existing.pending_count++;
          existing.pending_amount += penalty.penalty_amount || 0;
          existing.penalties.push(penaltyData);
        } else {
          salonMap.set(penalty.collecting_salon_id, {
            salon_id: penalty.collecting_salon_id,
            salon_name: penalty.salon?.name || 'Unknown',
            salon_image: penalty.salon?.image_url,
            pending_count: 1,
            pending_amount: penalty.penalty_amount || 0,
            penalties: [penaltyData]
          });
        }
      });

      setPendingBySalon(
        Array.from(salonMap.values()).sort((a, b) => b.pending_amount - a.pending_amount)
      );

      // Fetch remittance history
      const { data: remittances, error: remittanceError } = await supabase
        .from('salon_penalty_remittances')
        .select(`
          *,
          salon:salons(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (remittanceError) throw remittanceError;
      setRemittanceHistory((remittances || []) as unknown as RemittanceRecord[]);
    } catch (err) {
      console.error('Error fetching penalty remittance data:', err);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalPendingAmount = pendingBySalon.reduce((sum, s) => sum + s.pending_amount, 0);
  const totalPendingCount = pendingBySalon.reduce((sum, s) => sum + s.pending_count, 0);
  const totalRemitted = remittanceHistory.reduce((sum, r) => sum + r.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Remittance</p>
                <p className="text-2xl font-bold text-amber-600 font-sans">
                  ₹{totalPendingAmount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {totalPendingCount} penalties from {pendingBySalon.length} salons
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Remitted</p>
                <p className="text-2xl font-bold text-green-600 font-sans">
                  ₹{totalRemitted.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {remittanceHistory.length} remittance records
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Salons with Pending</p>
                <p className="text-2xl font-bold text-blue-600">{pendingBySalon.length}</p>
                <p className="text-xs text-muted-foreground">
                  Awaiting payout completion
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Store className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Pending Remittances by Salon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Pending Penalty Remittances
          </CardTitle>
          <CardDescription>
            Penalties collected by salons (via cash) that need to be deducted from their next payout
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingBySalon.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">All Clear!</p>
              <p className="text-sm">No pending penalty remittances</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salon</TableHead>
                  <TableHead className="text-center">Penalties</TableHead>
                  <TableHead className="text-right">Amount Owed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingBySalon.map((salon) => (
                  <TableRow key={salon.salon_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {salon.salon_image ? (
                          <img 
                            src={salon.salon_image} 
                            alt={salon.salon_name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Store className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{salon.salon_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Will be deducted from next payout
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                        {salon.pending_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium text-amber-600 font-sans">
                        ₹{salon.pending_amount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSalon(salon);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Remittance History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-green-600" />
            Remittance History
          </CardTitle>
          <CardDescription>
            Penalties that have been deducted from salon payouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {remittanceHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm">No remittance history yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Salon</TableHead>
                  <TableHead className="text-center">Penalties</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remittanceHistory.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(record.created_at), 'dd MMM yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.salon?.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {record.penalty_ids.length}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium text-green-600 font-sans">
                        ₹{record.total_amount.toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              {selectedSalon?.salon_name}
            </DialogTitle>
            <DialogDescription>
              Pending penalties collected by this salon
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {selectedSalon?.penalties.map((penalty) => (
                <div key={penalty.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{penalty.service_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Collected: {penalty.paid_at ? format(new Date(penalty.paid_at), 'dd MMM yyyy') : 'N/A'}
                      </p>
                    </div>
                    <span className="font-medium text-amber-600 font-sans">
                      ₹{penalty.penalty_amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Owed to Platform</span>
              <span className="text-xl font-bold text-amber-600 font-sans">
                ₹{selectedSalon?.pending_amount.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This amount will be automatically deducted when the salon's next payout is completed.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PenaltyRemittanceTracking;
