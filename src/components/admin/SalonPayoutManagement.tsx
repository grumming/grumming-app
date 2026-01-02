import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Wallet, ArrowUpRight, Clock, CheckCircle, 
  XCircle, Loader2, Search, Filter, RefreshCw, Plus,
  Store, User, CreditCard, AlertCircle, Eye, ChevronDown,
  IndianRupee, Calendar, Send, FileText, Download, Ban
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface SalonPayout {
  id: string;
  salon_id: string;
  amount: number;
  status: string;
  payout_method: string | null;
  notes: string | null;
  period_start: string | null;
  period_end: string | null;
  processed_at: string | null;
  created_at: string;
  salon?: { name: string; image_url: string };
}

interface SalonEarnings {
  salon_id: string;
  salon_name: string;
  salon_image: string | null;
  total_earned: number;
  total_paid: number;
  pending_payout: number;
  last_payout_date: string | null;
}

const SalonPayoutManagement = () => {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<SalonPayout[]>([]);
  const [salonEarnings, setSalonEarnings] = useState<SalonEarnings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreatePayout, setShowCreatePayout] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState<SalonEarnings | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSalon, setExpandedSalon] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('salon_payouts')
        .select(`
          *,
          salon:salons(name, image_url)
        `)
        .order('created_at', { ascending: false });

      if (payoutsError) throw payoutsError;
      setPayouts((payoutsData || []) as unknown as SalonPayout[]);

      // Fetch payments grouped by salon
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          salon_id,
          salon_amount,
          status,
          salon:salons(id, name, image_url)
        `)
        .in('status', ['captured', 'settled']);

      if (paymentsError) throw paymentsError;

      // Calculate earnings per salon
      const earningsMap = new Map<string, SalonEarnings>();
      
      (paymentsData || []).forEach((payment: any) => {
        if (!payment.salon_id) return;
        
        const existing = earningsMap.get(payment.salon_id);
        if (existing) {
          existing.total_earned += payment.salon_amount || 0;
          if (payment.status === 'captured') {
            existing.pending_payout += payment.salon_amount || 0;
          }
        } else {
          earningsMap.set(payment.salon_id, {
            salon_id: payment.salon_id,
            salon_name: payment.salon?.name || 'Unknown',
            salon_image: payment.salon?.image_url,
            total_earned: payment.salon_amount || 0,
            total_paid: 0,
            pending_payout: payment.status === 'captured' ? (payment.salon_amount || 0) : 0,
            last_payout_date: null
          });
        }
      });

      // Add payout data
      (payoutsData || []).forEach((payout: any) => {
        const earnings = earningsMap.get(payout.salon_id);
        if (earnings && payout.status === 'completed') {
          earnings.total_paid += payout.amount;
          earnings.pending_payout = Math.max(0, earnings.pending_payout - payout.amount);
          if (!earnings.last_payout_date || new Date(payout.processed_at) > new Date(earnings.last_payout_date)) {
            earnings.last_payout_date = payout.processed_at;
          }
        }
      });

      setSalonEarnings(Array.from(earningsMap.values()).sort((a, b) => b.pending_payout - a.pending_payout));
    } catch (err) {
      console.error('Error fetching payout data:', err);
      toast({ title: 'Error', description: 'Failed to load payout data', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('payouts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salon_payouts' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreatePayout = async () => {
    if (!selectedSalon || !payoutAmount) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('salon_payouts')
        .insert({
          salon_id: selectedSalon.salon_id,
          amount: parseFloat(payoutAmount),
          status: 'pending',
          notes: payoutNotes || null,
          period_start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
          period_end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Payout created successfully' });
      setShowCreatePayout(false);
      setSelectedSalon(null);
      setPayoutAmount('');
      setPayoutNotes('');
      fetchData();
    } catch (err) {
      console.error('Error creating payout:', err);
      toast({ title: 'Error', description: 'Failed to create payout', variant: 'destructive' });
    }
    setIsProcessing(false);
  };

  const handleProcessPayout = async (payoutId: string) => {
    try {
      const { error } = await supabase
        .from('salon_payouts')
        .update({
          status: 'processing',
          processed_at: new Date().toISOString()
        })
        .eq('id', payoutId);

      if (error) throw error;

      toast({ title: 'Processing', description: 'Payout is being processed' });
      fetchData();
    } catch (err) {
      console.error('Error processing payout:', err);
      toast({ title: 'Error', description: 'Failed to process payout', variant: 'destructive' });
    }
  };

  const handleCompletePayout = async (payoutId: string) => {
    try {
      const { error } = await supabase
        .from('salon_payouts')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', payoutId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Payout marked as completed' });
      fetchData();
    } catch (err) {
      console.error('Error completing payout:', err);
      toast({ title: 'Error', description: 'Failed to complete payout', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      pending: { variant: 'outline', icon: Clock },
      processing: { variant: 'secondary', icon: Loader2 },
      completed: { variant: 'default', icon: CheckCircle },
      failed: { variant: 'destructive', icon: XCircle },
      cancelled: { variant: 'destructive', icon: Ban }
    };
    
    const { variant, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="gap-1 capitalize">
        <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {status}
      </Badge>
    );
  };

  const totalPending = salonEarnings.reduce((sum, s) => sum + s.pending_payout, 0);
  const totalPaid = payouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payable</p>
                <p className="text-2xl font-bold text-orange-600">₹{totalPending.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{salonEarnings.filter(s => s.pending_payout > 0).length} salons</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid Out</p>
                <p className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">All time</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Payouts</p>
                <p className="text-2xl font-bold">{payouts.filter(p => p.status === 'pending').length}</p>
                <p className="text-xs text-muted-foreground">Awaiting processing</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salon Earnings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Salon Earnings</CardTitle>
            <CardDescription>View and manage salon payouts</CardDescription>
          </div>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : salonEarnings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No salon earnings data</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {salonEarnings.map((salon) => (
                  <Collapsible
                    key={salon.salon_id}
                    open={expandedSalon === salon.salon_id}
                    onOpenChange={() => setExpandedSalon(expandedSalon === salon.salon_id ? null : salon.salon_id)}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg overflow-hidden"
                    >
                      <CollapsibleTrigger className="w-full p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                              {salon.salon_image ? (
                                <img src={salon.salon_image} alt={salon.salon_name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Store className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="text-left">
                              <p className="font-medium">{salon.salon_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Total: ₹{salon.total_earned.toLocaleString()} • Paid: ₹{salon.total_paid.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {salon.pending_payout > 0 && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                                ₹{salon.pending_payout.toLocaleString()} pending
                              </Badge>
                            )}
                            <ChevronDown className={`w-5 h-5 transition-transform ${expandedSalon === salon.salon_id ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-4 pt-0 border-t bg-muted/30">
                          <div className="flex items-center justify-between mt-4">
                            <div className="text-sm">
                              {salon.last_payout_date && (
                                <p className="text-muted-foreground">
                                  Last payout: {format(new Date(salon.last_payout_date), 'dd MMM yyyy')}
                                </p>
                              )}
                            </div>
                            {salon.pending_payout > 0 && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedSalon(salon);
                                  setPayoutAmount(salon.pending_payout.toString());
                                  setShowCreatePayout(true);
                                }}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Create Payout
                              </Button>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </motion.div>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Recent Payouts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payouts</CardTitle>
          <CardDescription>Track payout status and history</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No payouts yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {payouts.slice(0, 20).map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <IndianRupee className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">₹{payout.amount.toLocaleString()}</span>
                          {getStatusBadge(payout.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {(payout.salon as any)?.name || 'Unknown'} • {format(new Date(payout.created_at), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {payout.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => handleProcessPayout(payout.id)}>
                          Process
                        </Button>
                      )}
                      {payout.status === 'processing' && (
                        <Button size="sm" onClick={() => handleCompletePayout(payout.id)}>
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create Payout Dialog */}
      <Dialog open={showCreatePayout} onOpenChange={setShowCreatePayout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Payout</DialogTitle>
            <DialogDescription>
              Create a new payout for {selectedSalon?.salon_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending Amount</span>
                <span className="font-medium">₹{selectedSalon?.pending_payout.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Payout Amount</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes about this payout..."
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePayout(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePayout} disabled={isProcessing || !payoutAmount}>
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Create Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalonPayoutManagement;
